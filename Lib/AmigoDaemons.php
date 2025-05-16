<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */


namespace Modules\ModuleCTIClientV5\Lib;

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Modules\ModuleCTIClientV5\Models\ModuleCTIClientV5;
use Phalcon\Di\Injectable;
use Throwable;

/**
 * @property \Phalcon\Config\Config $config
 */
class AmigoDaemons extends Injectable
{
    public const SERVICE_ASTERISK = 'cti5-asterisk';
    public const SERVICE_CORE = 'cti5-core';
    public const SERVICE_TELEGRAM = 'cti5-tg';
    public const SERVICE_WHATSAPP = 'cti5-wa';

    public array $dirs;
    private array $module_settings = [];
    private string $moduleUniqueID = 'ModuleCTIClientV5';

    /**
     * Constructor for the class.
     */
    public function __construct()
    {
        // Check if the module is enabled
        if (PbxExtensionUtils::isEnabled($this->moduleUniqueID)) {
            // Retrieve the module settings from the database
            $module_settings = ModuleCTIClientV5::findFirst();
            if ($module_settings !== null) {
                $this->module_settings = $module_settings->toArray();
            }
        }

        // Create an instance of MikoPBXConfig
        $this->mikoPBXConfig = new MikoPBXConfig();

        // Get the module directories
        $this->dirs = $this->getModuleDirs();
    }

    /**
     * Prepares directories for storing module configurations and logs.
     *
     * @return array An array containing the directory paths.
     */
    private function getModuleDirs(): array
    {
        // moduleDir
        $moduleDir = PbxExtensionUtils::getModuleDir($this->moduleUniqueID);

        // binDir
        $binDir = $moduleDir . '/bin';
        Util::mwMkdir($binDir);

        // storeDir
        $storeDir = $moduleDir . '/db';
        Util::mwMkdir($storeDir);
       
        // logDir
        $logDir = System::getLogDir();
        $logDir = "{$logDir}/{$this->moduleUniqueID}";
        Util::mwMkdir($logDir);

        // pid
        $pidDir = "/var/run/custom_modules/{$this->moduleUniqueID}";
        Util::mwMkdir($pidDir);

        // confDir
        $confDir = "{$storeDir}/etc";
        Util::mwMkdir($confDir);

        // SessionsDir
        $tempDir = $this->config->path('core.tempDir');
        $sessionsDir = "{$tempDir}/{$this->moduleUniqueID}/sessions";
        Util::mwMkdir($sessionsDir);

        return [
            'logDir' => $logDir,
            'storeDir' => $storeDir,
            'confDir' => $confDir,
            'pidDir' => $pidDir,
            'binDir' => $binDir,
            'moduleDir' => $moduleDir,
            'sessionsDir' => $sessionsDir,
        ];
    }

    /**
     * Deletes logs older than one week.
     */
    public function deleteOldLogs(): void
    {
        $findPath = Util::which('find');
        $rmPath = Util::which('rm');
        $xargsPath = Util::which('xargs');
        Processes::mwExec(
            "{$findPath} '{$this->dirs['logDir']}' -name '*.log.[0-9]' -mtime +7 | {$xargsPath} {$rmPath} > /dev/null 2> /dev/null"
        );
        Processes::mwExec(
            "{$findPath} '{$this->dirs['logDir']}' -name '*.log.[0-9][0-9]' -mtime +7 | {$xargsPath} {$rmPath} > /dev/null 2> /dev/null"
        );
        Processes::mwExec(
            "{$findPath} '{$this->dirs['logDir']}' -name '*.log' -mtime +7 | {$xargsPath} {$rmPath} > /dev/null 2> /dev/null"
        );
    }

    /**
     * Stops all CTI services.
     */
    public function stopAllServices(): void
    {
        $serviceList = [
            self::SERVICE_ASTERISK,
            self::SERVICE_CORE,
            self::SERVICE_TELEGRAM,
            self::SERVICE_WHATSAPP
        ];

        foreach ($serviceList as $service) {
            $path = "{$this->dirs['binDir']}/{$service}";
            Processes::processWorker($path, '', $service, 'stop');
        }
    }

    /**
     * Starts or restarts all services.
     *
     * @param bool $restart Whether to restart the services.
     */
    public function startAllServices(bool $restart = false): void
    {
        $moduleEnabled = PbxExtensionUtils::isEnabled($this->moduleUniqueID);

        $corePID = Processes::getPidOfProcess(self::SERVICE_CORE);

        if (
            $corePID !== ''
            && $restart === false
            && $moduleEnabled === true
        ) {
            return;  // Nothing to do, everything is already running
        }

        if ($moduleEnabled) {
            $this->generateConfFiles();
            if ($restart) {
                $this->stopAllServices();
            }
            Processes::processWorker(
                "{$this->dirs['binDir']}/" . self::SERVICE_CORE,
                "-c {$this->dirs['confDir']}/config.json",
                self::SERVICE_CORE,
                'start',
                $this->dirs['logDir'] . '/core_process.log'
            );
        } else {
            $this->stopAllServices();
        }
    }

    /**
     * Create configs for all services
     */
    private function generateConfFiles(): void
    {
        $this->generateCoreConf();
        $this->generateHeadersConf();
        $this->generateAsteriskCredentialsConf();
        $this->generateMikoPBXDefaultConf();
    }

    /**
     * Start the task queue server and makes - config.json and config.default.json
     */
    private function generateCoreConf(): void
    {
        $pid_file = "{$this->dirs['pidDir']}/core.pid";

        $settings = [
            'log' => [
               'level' => intval($this->module_settings['debug_mode']) === 1 ? 6 : 4,
               'dir' => $this->dirs['logDir'],
            ],
            'nats' => [
                'port' => intval($this->getNatsPort()),
            ],
            'http_server' => [
                'port' => intval($this->getNatsHttpPort()),
            ],
            'store_dir' => $this->dirs['storeDir'],
            'binary_dir' => $this->dirs['binDir'],
            'session_dir' => $this->dirs['sessionsDir'],
            'authorization_token' => $this->module_settings['nats_password'],
            'license_key' => PbxSettings::getValueByKey('PBXLicense')
        ];

        // Config default file
        $config_default_file = "{$this->dirs['confDir']}/config.default.json";
        file_put_contents($config_default_file, json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        
        // Config file
        $config_file = "{$this->dirs['confDir']}/config.json";
        if (!file_exists($config_file)) {
            file_put_contents($config_file, json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }
        if (file_exists($pid_file)) {
            $pid = file_get_contents($pid_file);
            Processes::mwExec("{$this->dirs['binDir']}/" . self::SERVICE_CORE . " reopen={$pid} > /dev/null 2> /dev/null");
        }
    }

    /**
     * Get the port on which the NATS queue is running.
     *
     * @return string
     */
    public static function getNatsPort(): string
    {
        return '5222';
    }

    /**
     * Get the HTTP port on which the NATS queue is running.
     *
     * @return string
     */
    public static function getNatsHttpPort(): string
    {
        return '9222';
    }


    /**
     * Generate the auto-answer settings file.
     */
    private function generateHeadersConf(): void
    {
        $settings_headers = [
            [
                'header' => [
                    'default' => 'SIPADDHEADER="Call-Info:\\;answer-after=0"',
                    'pbx' => [
                        [
                            'name' => 'FreePBX',
                            'driver' => [
                                'PJSIP' => 'PJSIP_HEADER(add,Call-Info)="\\;answer-after=0"',
                            ],
                        ],
                    ],
                ],
                'phones' => [
                    'linksys',
                    'cisco',
                    'miko',
                    'telephone-pt1c',
                    'nightbird',
                    'grandstream',
                    'microsip',
                    'zoiper',
                ],
            ],
            [
                'header' => [
                    'default' => 'SIPADDHEADER="Call-Info:answer-after=0"',
                    'pbx' => [
                        [
                            'name' => 'FreePBX',
                            'driver' => [
                                'PJSIP' => 'PJSIP_HEADER(add,Call-Info)="answer-after=0"',
                            ],
                        ],
                    ],
                ],
                'phones' => [
                    'yealink',
                    'vp530p',
                ],
            ],
            [
                'header' => [
                    'default' => 'SIPADDHEADER="Call-Info: sip:127.0.0.1\\;answer-after=0"',
                    'pbx' => [
                        [
                            'name' => 'FreePBX',
                            'driver' => [
                                'PJSIP' => 'PJSIP_HEADER(add,Call-Info)="sip:127.0.0.1\\;answer-after=0"',
                            ],
                        ],
                    ],
                ],
                'phones' => [
                    'snom',
                ],
            ],
            [
                'header' => [
                    'default' => 'SIPADDHEADER="Alert-Info: info=alert-autoanswer"',
                    'pbx' => [
                        [
                            'name' => 'FreePBX',
                            'driver' => [
                                'PJSIP' => 'PJSIP_HEADER(add,Alert-Info)="info=alert-autoanswer"',
                            ],
                        ],
                    ],
                ],
                'phones' => [
                    'aastra',
                    'fanvil',
                ],
            ],
            [
                'header' => [
                    'default' => 'SIPADDHEADER="Alert-Info: Ring Answer"',
                    'pbx' => [
                        [
                            'name' => 'FreePBX',
                            'driver' => [
                                'PJSIP' => 'PJSIP_HEADER(add,Alert-Info)="Ring Answer"',
                            ],
                        ],
                    ],
                ],
                'phones' => [
                    'polycom',
                ],
            ],
            [
                'header' => [
                    'default' => 'SIPADDHEADER="Alert-Info:Auto Answer"',
                    'pbx' => [
                        [
                            'name' => 'FreePBX',
                            'driver' => [
                                'PJSIP' => 'PJSIP_HEADER(add,Alert-Info)="Auto Answer"',
                            ],
                        ],
                    ],
                ],
                'phones' => [
                    'jitsi',
                ],
            ],
        ];

        $sip_headers_file = "{$this->dirs['storeDir']}/sip_headers.json";
        file_put_contents(
            $sip_headers_file,
            json_encode($settings_headers, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
    }

     /**
     * Generates services_permanent.json and cred.json
     */
    private function generateAsteriskCredentialsConf(): void
    {
        $cred_settings = [
            'user' => CTIClientV5Conf::MODULE_AMI_USER,
            'password' => $this->module_settings['ami_password'],
            'host' => '127.0.0.1',
            'port' => intval(PbxSettings::getValueByKey('AMIPort')),
        ];
        $UID = md5($this->module_settings['asterisk_uid']);

        $credDir = "{$this->dirs['storeDir']}/asterisk/{$UID}";
        Util::mwMkdir($credDir);
        file_put_contents(
            "{$credDir}/cred.json",
            json_encode($cred_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        $permanent_settings = [
            [
                'id' => $UID,
                'name' => 'asterisk',
                'permanent' => true,
                'args' => '--pbx mikopbx',
            ]
        ];
        $permanent_settings_file = "{$this->dirs['storeDir']}/services_permanent.json";
        file_put_contents(
            $permanent_settings_file,
            json_encode($permanent_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
        
    }

    /**
     * Generates mikopbx_defaults.json config
     */
    private function generateMikoPBXDefaultConf(): void
    {
        $settings_amid = [
            'pbx' => 'mikopbx',
            'web_port' => PbxSettings::getValueByKey('WEBPort'),
            'originate' => [
                'default_context' => 'all_peers',
                'transfer_context' => 'internal-transfer',
                'originate_context' => 'internal-originate',
                'interception_support' => true,
                'interception_context' => 'interception-bridge',
                'interception_timeout' => 10,
                'multiple_registration_support' => true,
            ],
            'call_records' => [
                'request' => "/pbxcore/api/cdr/playback?view=%s",
                'path' => "/storage/usbdisk1/mikopbx/astspool/monitor/",
                'mp3playback' => true,
            ],
        ];

        $mikopbx_defaults_file = "{$this->dirs['storeDir']}/mikopbx_defaults.json";
        file_put_contents(
            $mikopbx_defaults_file,
            json_encode($settings_amid, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        $moduleVersion = 'unknown';
        $currentModuleInfo = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueID);
        if ($currentModuleInfo) {
             $moduleVersion = $currentModuleInfo->version;
        }
        $module_version_file = "{$this->dirs['storeDir']}/module_version";
        file_put_contents(
            $module_version_file,
            $moduleVersion
        );

    }

    /**
     * Check if the module is working properly.
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     */
    public function checkModuleWorkProperly(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $moduleEnabled = PbxExtensionUtils::isEnabled($this->moduleUniqueID);
        if (!$moduleEnabled) {
            $res->data['statuses'] = 'Module disabled';

            return $res;
        }
        $statuses = [];
        $statuses[] = $this->checkCoreStatus();
        $statuses = array_merge($statuses, $this->checkWorkerStatuses());

        $res->success = true;
        foreach ($statuses as $workerStatus) {
            if (!$res->success) {
                break;
            }
            $res->success = array_key_exists('state', $workerStatus) && $workerStatus['state'] === 'ok';
        }

        $res->data['statuses'] = $statuses;
        return $res;
    }

    /**
     * Check the status of Core server.
     *
     * @return array
     */
    private function checkWorkerStatuses(): array
    {
        $webPort = self::getNatsHttpPort();

        $statusUrl = "http://127.0.0.1:{$webPort}/state";
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_TIMEOUT, 10);
        curl_setopt($curl, CURLOPT_URL, $statusUrl);

        try {
            $response = curl_exec($curl);
            $data = json_decode($response, true);
        } catch (Throwable $e) {
            $data = null;
        }
        $result = [];
        curl_close($curl);
        if (
            $data !== null
            && array_key_exists('result', $data)
            && is_array($data['result'])
        ) {
            $result = $data['result'];
        } else {
            $result[] = [
                'name' =>self::SERVICE_CORE,
                'state' => 'unknown',
            ];
        }
        return $result;

    }

    /**
     * Check the status of the core process.
     *
     * @return array
     */
    private function checkCoreStatus(): array
    {
        $result = [
            'name' => self::SERVICE_CORE,
            'state' => 'unknown',
        ];
        $pid = Processes::getPidOfProcess(self::SERVICE_CORE);
        if (!empty($pid)) {
            $result['state'] = 'ok';
            $result['pid'] = $pid;
        }

        return $result;
    }

    /**
     * Get the caller ID for a given number from CRM system
     *
     * @param string $number The phone number.
     * @return string The caller ID.
     */
    public static function getCallerId(string $number): string
    {
        $webPort = self::getNatsHttpPort();
        $getNumberUrl = "http://127.0.0.1:{$webPort}/ivr/callerid?number={$number}";
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_TIMEOUT, 5);
        curl_setopt($curl, CURLOPT_URL, $getNumberUrl);

        try {
            $response = curl_exec($curl);
            $response = str_replace('\n', '', $response);
            $parsedAnswer = json_decode($response, true);
        } catch (Throwable $e) {
            $parsedAnswer = null;
        }
        curl_close($curl);
        $result = '';
        if (
            $parsedAnswer !== null
            && $parsedAnswer['ok'] === true
        ) {
            if (!empty($parsedAnswer['result']['caller_id'])) {
                $result = $parsedAnswer['result']['caller_id'];
            } elseif (!empty($parsedAnswer['result']['client'])) {
                $result = $parsedAnswer['result']['client'];
            }
        }

        return $result;
    }
}
