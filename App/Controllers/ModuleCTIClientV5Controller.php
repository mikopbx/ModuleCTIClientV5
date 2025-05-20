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

namespace Modules\ModuleCTIClientV5\App\Controllers;

use MikoPBX\AdminCabinet\Controllers\BaseController;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Providers;

use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use MikoPBX\Modules\PbxExtensionUtils;
use Modules\ModuleCTIClientV5\App\Forms\ModuleCTIClientV5Form;
use Modules\ModuleCTIClientV5\Models\ModuleCTIClientV5;
use Phalcon\Mvc\View;
use function MikoPBX\Common\Config\appPath;

class ModuleCTIClientV5Controller extends BaseController
{
    private $moduleUniqueID = 'ModuleCTIClientV5';
    private $moduleDir;

    /**
     * Initializes the module by setting the module directory, logo image path, and submit mode.
     * It also calls the parent's initialize method.
     */
    public function initialize(): void
    {
        $this->moduleDir = PbxExtensionUtils::getModuleDir($this->moduleUniqueID);

        // Set the logo image path using the module's unique ID
        $this->view->logoImagePath = "{$this->url->get()}assets/img/cache/{$this->moduleUniqueID}/logo.svg";

        // Set the submit mode to null
        $this->view->submitMode = null;

        // Call the initialize method of the parent class
        parent::initialize();
    }


    /**
     * The index action of the module.
     * Adds JavaScript files to the footer collection, retrieves module settings,
     * initializes the view variables, and sets the view template.
     */
    public function indexAction(): void
    {
        // Get the footer collection for JavaScript files
        $footerCollection = $this->assets->collection('footerJS');

        // Add necessary JavaScript files to the footer collection
        $footerCollection->addJs('js/pbx/main/form.js', true);
        $footerCollection->addJs("js/cache/{$this->moduleUniqueID}/module-cti-client-v5-status-worker.js", true);
        $footerCollection->addJs("js/cache/{$this->moduleUniqueID}/module-cti-client-v5-index.js", true);

        // Retrieve module settings
        $settings = ModuleCTIClientV5::findFirst();

        // If no settings found, create a new instance
        if ($settings === null) {
            $settings = new ModuleCTIClientV5();
        }

        // Initialize view variables
        $this->view->form = new ModuleCTIClientV5Form($settings);

    }

    /**
     * Saves the module settings based on the submitted form data.
     * If the request method is not POST, the function returns early.
     * Retrieves the form data, finds or creates a ModuleCTIClient record,
     * and updates the record with the form data. Finally, saves the record
     * and handles success or error messages.
     */
    public function saveAction(): void
    {
        // If the request method is not POST, return early
        if (!$this->request->isPost()) {
            return;
        }
        // Retrieve the form data
        $data = $this->request->getPost();

        // Find or create a ModuleCTIClientV5 record
        $record = ModuleCTIClientV5::findFirst();
        if (!$record) {
            $record = new ModuleCTIClientV5();
        }

        // Update the record with the form data
        foreach ($record as $key => $value) {
            switch ($key) {
                case 'id':
                case 'ami_password':
                case 'authorization_token':
                case 'asterisk_uid':
                    break;
                case 'setup_caller_id':
                case 'transliterate_caller_id':
                case 'reset_settings':
                    if (isset($data[$key])) {
                        $record->$key = ($data[$key] === 'on') ? '1' : '0';
                    }
                    break;
                default:
                    if (array_key_exists($key, $data)) {
                        $record->$key = $data[$key];
                    }
            }
        }

        // Save the record
        if ($record->save() === false) {
            // Handle errors if saving fails
            $errors = $record->getMessages();
            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;

            return;
        }

        // Handle success if saving is successful
        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
    }


    /**
     * Retrieves a list of PBX extensions with numbers and avatars in JSON format.
     *
     * Example:
     * curl "http://127.0.0.1:{web_port}/admin-cabinet/module-c-t-i-client-v5/getExtensions"
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


        $this->view->setRenderLevel(View::LEVEL_NO_RENDER);
        $this->response->setContentType('application/json', 'UTF-8');
        $data = json_encode($resultTable);
        $this->response->setContent($data);
    }

    /**
     * Retrieves a list of queues and applications with human-readable names in JSON format.
     *
     * Example:
     * curl "http://127.0.0.1:{web_port}/admin-cabinet/module-c-t-i-client-v5/getIdMatchNamesList"
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

        $this->view->setRenderLevel(View::LEVEL_NO_RENDER);
        $this->response->setContentType('application/json', 'UTF-8');
        $data = json_encode($extensionTable);
        $this->response->setContent($data);
    }
}
