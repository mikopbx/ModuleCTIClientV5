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
            $settings = ModuleCTIClientV5::findFirst();
            if ($settings === null) {
                $settings                     = new ModuleCTIClientV5();
                $settings->debug_mode         = '0';
                $settings->setup_caller_id    = '0';
                $settings->transliterate_caller_id = '0';
            }

            if (empty($settings->ami_password)) {
                $settings->ami_password = MikoPBXVersion::generateRandomPassword(16);
            }

            if (empty($settings->authorization_token)) {
                $settings->authorization_token = MikoPBXVersion::generateRandomPassword(16);
            }

            if (empty($settings->asterisk_uid)) {
                $settings->asterisk_uid = MikoPBXVersion::generateUUIDv4();
            }

            if (!$settings->save()) {
                Util::sysLogMsg(
                    'update_system_config',
                    'Error: Failed to save module settings.'
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
     * Выполняет удаление своих файлов с остановкой процессов
     * при необходимости
     *
     * @return bool Результат удаления
     */
    public function unInstallFiles($keepSettings = false): bool
    {
        Processes::killbyname(AmigoDaemons::SERVICE_TELEGRAM);
        Processes::killbyname(AmigoDaemons::SERVICE_WHATSAPP);
        Processes::killbyname(AmigoDaemons::SERVICE_ASTERISK);
        Processes::killbyname(AmigoDaemons::SERVICE_CORE);

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