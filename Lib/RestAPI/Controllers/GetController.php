<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace Modules\ModuleCTIClientV5\Lib\RestAPI\Controllers;
use MikoPBX\Core\System\Processes;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\PBXCoreREST\Controllers\Modules\ModulesControllerBase;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Modules\ModuleCTIClientV5\Lib\AmigoDaemons;
use Modules\ModuleCTIClientV5\Models\ModuleCTIClientV5;
use Throwable;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;

class GetController extends ModulesControllerBase
{
    private string $moduleUniqueID = 'ModuleCTIClientV5';


    /**
     * Get the status of the module.
     *
     * Example:
     * curl "http://127.0.0.1:{web_port}/pbxcore/api/module-cti-client-v5/getModuleStatus"
     *
     * @return void
     */
    public function getModuleStatusAction(): void
    {
        $res = $this->checkModuleWorkProperly();
        $this->response->setJsonContent($res->getResult());
        $this->response->send();
    }
   

     /**
     * Retrieves a list of PBX extensions with numbers and avatars in JSON format.
     *
     * Example:
     * curl "http://127.0.0.1:{web_port}/pbxcore/api/module-cti-client-v5/getExtensions"
     */
    public function getExtensionsAction(): void
    {
        $extensionTable = [];
        $resultTable = [];
        $pjsipPort = PbxSettings::getValueByKey('SIPPort');
        $parameters = [
            'models' => [
                'Extensions' => Extensions::class,
            ],
            'conditions' => 'Extensions.is_general_user_number = 1',
            'columns' => [
                'userid' => 'Extensions.userid',
                'username' => 'Users.username',
                'secret' => 'Sip.secret',
                'transport' => 'Sip.transport',
                'dtmfmode' => 'Sip.dtmfmode',
                'number' => 'Extensions.number',
                'type' => 'Extensions.type',
                'avatar' => 'Users.avatar',
                'email' => 'Users.email',

            ],
            'order' => 'number',
            'joins' => [
                'Sip' => [
                    0 => Sip::class,
                    1 => 'Sip.extension=Extensions.number',
                    2 => 'Sip',
                    3 => 'LEFT',
                ],
                'Users' => [
                    0 => Users::class,
                    1 => 'Users.id = Extensions.userid',
                    2 => 'Users',
                    3 => 'INNER',
                ],
            ],
        ];
        $query = $this->di->get('modelsManager')->createBuilder($parameters)->getQuery();
        $extensions = $query->execute();
        foreach ($extensions as $extension) {
            switch ($extension->type) {
                case 'SIP':
                    $extensionTable[$extension->userid]['userid'] = $extension->userid;
                    $extensionTable[$extension->userid]['secret'] = $extension->secret;
                    $extensionTable[$extension->userid]['number'] = $extension->number;
                    $extensionTable[$extension->userid]['username'] = $extension->username;
                    $extensionTable[$extension->userid]['email'] = $extension->email;
                    $extensionTable[$extension->userid]['port'] = $pjsipPort;
                    $extensionTable[$extension->userid]['transport'] = $extension->transport;
                    $extensionTable[$extension->userid]['dtmfmode'] = $extension->dtmfmode;
                    if (!empty($extension->avatar)) {
                        $extensionTable[$extension->userid]['avatar'] = md5($extension->avatar);
                    } else {
                        $extensionTable[$extension->userid]['avatar'] = '';
                    }
                    if (!key_exists('mobile', $extensionTable[$extension->userid])) {
                        $extensionTable[$extension->userid]['mobile'] = '';
                    }

                    break;
                case 'EXTERNAL':
                    $extensionTable[$extension->userid]['mobile'] = $extension->number;
                    break;
                default:
            }
        }

        // Transform into an array with the same structure
        foreach ($extensionTable as $extension) {
            $resultTable[] = [
                'userid' => $extension['userid'],
                'number' => $extension['number'],
                'secret' => base64_encode($extension['secret']),
                'username' => $extension['username'],
                'mobile' => $extension['mobile'],
                'avatar' => $extension['avatar'],
                'email' => $extension['email'],
                'port' => $extension['port'],
                'transport' => $extension['transport'],
                'dtmfmode' => $extension['dtmfmode'],
            ];
        }

        $this->response->setJsonContent($resultTable);
        $this->response->send();
    }

    /**
     * Retrieves a list of queues and applications with human-readable names in JSON format.
     *
     * Example:
     * curl "http://127.0.0.1:{web_port}/pbxcore/api/module-cti-client-v5/getIdMatchNamesList"
     */
    public function getIdMatchNamesListAction(): void
    {
        $extensionTable = [];

        $parameters = [
            'conditions' => 'userid IS NULL',
            'order' => 'number',
        ];

        $extensions = Extensions::find($parameters);
        foreach ($extensions as $extension) {
            switch (strtoupper($extension->type)) {
                case Extensions::TYPE_PARKING:
                    $extensionTable[] =
                        [
                            'name' => 'ParkingSlot',
                            'number' => $extension->number,
                            'type' => $extension->type,
                            'uniqid' => '',
                        ];
                    break;
                case Extensions::TYPE_CONFERENCE:
                    $extensionTable[] =
                        [
                            'name' => $extension->ConferenceRooms->name,
                            'number' => $extension->number,
                            'type' => $extension->type,
                            'uniqid' => $extension->ConferenceRooms->uniqid,
                        ];
                    break;
                case Extensions::TYPE_QUEUE:
                    $extensionTable[] =
                        [
                            'name' => $extension->CallQueues->name,
                            'number' => $extension->number,
                            'type' => $extension->type,
                            'uniqid' => $extension->CallQueues->uniqid,
                        ];
                    break;
                case Extensions::TYPE_DIALPLAN_APPLICATION:
                    $extensionTable[] =
                        [
                            'name' => $extension->DialplanApplications->name,
                            'number' => $extension->number,
                            'type' => $extension->type,
                            'uniqid' => $extension->DialplanApplications->uniqid,
                        ];
                    break;
                case Extensions::TYPE_IVR_MENU:
                    $extensionTable[] =
                        [
                            'name' => $extension->IvrMenu->name,
                            'number' => $extension->number,
                            'type' => $extension->type,
                            'uniqid' => $extension->IvrMenu->uniqid,
                        ];
                    break;
                case Extensions::TYPE_MODULES:
                    $extensionTable[] =
                        [
                            'name' => $extension->callerid,
                            'number' => $extension->number,
                            'type' => $extension->type,
                            'uniqid' => '',
                        ];
                    break;
                default:
            }
        }

        // Add the list of providers
        $providers = Providers::find();
        foreach ($providers as $provider) {
            $modelType = ucfirst($provider->type);
            $provByType = $provider->$modelType;
            $extensionTable[] = [
                'uniqid' => $provByType->uniqid,
                'name' => $provByType->description,
                'type' => 'PROVIDER',
                'number' => '',
            ];
        }

        $this->response->setJsonContent($extensionTable);
        $this->response->send();
    }

     /**
     * Check if the module is working properly.
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     */
    private function checkModuleWorkProperly(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $moduleEnabled = PbxExtensionUtils::isEnabled($this->moduleUniqueID);
        if (!$moduleEnabled) {
            $res->data['statuses'] = 'Module disabled';

            return $res;
        }
        $webPort = AmigoDaemons::getNatsHttpPort();
        $authorizationToken = ModuleCTIClientV5::findFirst()->authorization_token;

        $statusUrl = "http://127.0.0.1:{$webPort}/state";
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_TIMEOUT, 10);
        curl_setopt($curl, CURLOPT_URL, $statusUrl);
        
        // Add authorization header
        $headers = ["Authorization: Token {$authorizationToken}"];
        curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);

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
            $result = [
                'name' => AmigoDaemons::SERVICE_CORE,
                'state' => 'unknown',
            ];
            $pid = Processes::getPidOfProcess(AmigoDaemons::SERVICE_CORE);
            if (!empty($pid)) {
                $result['state'] = 'ok';
                $result['pid'] = $pid;
            }
        }

        $res->success = true;
        $res->data['statuses'] = $result;
        return $res;
    }
}