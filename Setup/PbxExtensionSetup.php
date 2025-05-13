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

namespace Modules\ModuleCTIClientV5\Setup;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Setup\PbxExtensionSetupBase;
use Modules\ModuleCTIClientV5\Lib\AmigoDaemons;
use Modules\ModuleCTIClientV5\Lib\MikoPBXVersion;
use Modules\ModuleCTIClientV5\Models\ModuleCTIClientV5;

/**
 * @property array $messages
 */
class PbxExtensionSetup extends PbxExtensionSetupBase
{

    private string $number = '000XXXX';

    /**
     * Создает структуру для хранения настроек модуля в своей модели
     * и заполняет настройки по-умолчанию если таблицы не было в системе
     * см (unInstallDB)
     *
     * Регистрирует модуль в PbxExtensionModules
     *
     * @return bool Результат установки
     */
    public function installDB(): bool
    {
        // Создаем базу данных
        $result = $this->createSettingsTableByModelsAnnotations();


        if ($result) {
            $this->db->begin();
            $settings = ModuleCTIClientV5::findFirst();
            if ($settings === null) {
                $settings                     = new ModuleCTIClientV5();
                $settings->debug_mode         = '0';
                $settings->web_service_mode   = '0';
                $settings->auto_settings_mode = '1';
                $settings->setup_caller_id    = '1';
                $settings->transliterate_caller_id = '0';
            }

            if (empty($settings->ami_password)) {
                $settings->ami_password = MikoPBXVersion::generateRandomPassword(16);
            }

            if (empty($settings->nats_password)) {
                $settings->nats_password = MikoPBXVersion::generateRandomPassword(16);
            }

            if (empty($settings->asterisk_uid)) {
                $settings->asterisk_uid = MikoPBXVersion::generateRandomPassword(16);
            }

            // Приложение для авторизации внешней панели.
            $record = Extensions::findFirst('number="' . $this->number . '"');
            if ($record === null) {
                $record                    = new Extensions();
                $record->number            = $this->number;
                $record->type              = 'DIALPLAN APPLICATION';
                $record->callerid          = 'Module CTI Client V5 auth app';
                $record->show_in_phonebook = 0;
            }
            $d_app = DialplanApplications::findFirst('extension="' . $this->number . '"');

            if ($d_app === null) {
                $d_app            = new DialplanApplications();
                $d_app->uniqid    = 'DIALPLAN-APPLICATION-' . md5(time());
                $d_app->extension = $this->number;
            }
            $logic = '1,Answer()' . "\n" .
                'n,Playback(beep)' . "\n" .
                'n,Playback(silence/1)' . "\n" .
                'n,Playback(silence/1)' . "\n" .
                'n,Hangup';


            $d_app->name             = $this->translation->_('mod_cti_AuthApp_Name');
            $d_app->description      = $this->translation->_('mod_cti_AuthApp_Description');

            $d_app->applicationlogic = base64_encode($logic);
            $d_app->type             = 'plaintext';

            if ($record->save() && $d_app->save() && $settings->save()) {
                $this->db->commit();
            } else {
                $this->db->rollback();
                Util::sysLogMsg(
                    'update_system_config',
                    'Error: Failed to update table the Extensions and the DialplanApplications tables.'
                );
                $result = false;
            }
        }
        // Регаем модуль в PBX Extensions
        if ($result) {
            $result = $this->registerNewModule();
        }

        if ($result) {
            $result = $this->addToSidebar();
        }

        return $result;
    }

    /**
     * Выполняет копирование необходимых файлов, в папки системы
     *
     * @return bool Результат установки
     */
    public function installFiles(): bool
    {
        // Create chatdb folder
        $chat_database_path = $this->moduleDir . '/db/chats/';
        Util::mwMkdir($chat_database_path);

        parent::installFiles();

        return true;
    }

    /**
     * Удаляет запись о модуле из PbxExtensionModules.
     * Удаляет свою модель
     *
     * @param  $keepSettings string Оставляет таблицу с данными своей модели
     *
     * @return bool Результат очистки
     */
    public function unInstallDB($keepSettings = false): bool
    {
        $result = true;
        // Удалим запись Extension для модуля
        $record = Extensions::findFirst('number="' . $this->number . '"');
        if ($record) {
            $result = $result && $record->delete();
        }
        parent::unInstallDB($keepSettings);

        return $result;
    }

    /**
     * Выполняет удаление своих файлов с остановкой процессов
     * при необходимости
     *
     * @return bool Результат удаления
     */
    public function unInstallFiles($keepSettings = false): bool
    {
        Processes::killbyname(AmigoDaemons::SERVICE_TELEGRAM);
        Processes::killbyname(AmigoDaemons::SERVICE_WHATSAPP);
        Processes::killbyname(AmigoDaemons::SERVICE_CORE);
        Processes::killbyname(AmigoDaemons::SERVICE_ASTERISK);

        // confDir
        $confDir = '/etc/custom_modules/ModuleCTIClientV5';
        Processes::mwExec("rm -rf {$confDir}");

        // spoolDir
        $spoolDir = '/var/spool/custom_modules/ModuleCTIClientV5';
        Processes::mwExec("rm -rf {$spoolDir}");

        // logDir
        $logDir = System::getLogDir();
        $logDir = "{$logDir}/ModuleCTIClientV5";
        Processes::mwExec("rm -rf {$logDir}");

        // pid
        $pidDir = '/var/run/custom_modules/ModuleCTIClientV5';
        Processes::mwExec("rm -rf {$pidDir}");


        return parent::unInstallFiles($keepSettings);
    }

    /**
     * Adds the module to the sidebar menu.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#addtosidebar
     *
     * @return bool The result of the addition process.
     */
    public function addToSidebar(): bool
    {
        $menuSettingsKey           = "AdditionalMenuItem{$this->moduleUniqueID}";
        $menuSettings              = PbxSettings::findFirstByKey($menuSettingsKey);
        if ($menuSettings === null) {
            $menuSettings      = new PbxSettings();
            $menuSettings->key = $menuSettingsKey;
        }
        $value               = [
            'uniqid'        => $this->moduleUniqueID,
            'group'         => 'integrations',
            'iconClass'     => 'puzzle',
            'caption'       => "Breadcrumb{$this->moduleUniqueID}",
            'showAtSidebar' => true,
        ];
        $menuSettings->value = json_encode($value);

        return $menuSettings->save();
    }


}