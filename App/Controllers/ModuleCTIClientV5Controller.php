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

namespace Modules\ModuleCTIClientV5\App\Controllers;

use MikoPBX\AdminCabinet\Controllers\BaseController;
use Modules\ModuleCTIClientV5\App\Forms\ModuleCTIClientV5Form;
use Modules\ModuleCTIClientV5\Models\ModuleCTIClientV5;

class ModuleCTIClientV5Controller extends BaseController
{
    private $moduleUniqueID = 'ModuleCTIClientV5';


    /**
     * Initializes the module by setting the module directory, logo image path, and submit mode.
     * It also calls the parent's initialize method.
     */
    public function initialize(): void
    {
        // Call the initialize method of the parent class
         parent::initialize();

        // Set the logo image path using the module's unique ID
        $this->view->logoImagePath = "{$this->url->get()}assets/img/cache/{$this->moduleUniqueID}/logo.svg";

        // Set the submit mode to null
        $this->view->submitMode = null;
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
}
