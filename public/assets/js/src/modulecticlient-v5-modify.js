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

/* global globalRootUrl, globalTranslate, Form, Config */
const ModuleCTIClientV5Modify = {
	$formObj: $('#modulecticlient-v5-form'),
	$checkBoxes: $('#modulecticlient-v5-form .ui.checkbox'),
	$dropDowns: $('#modulecticlient-v5-form .ui.dropdown'),

	/**
	 * Field validation rules
	 * https://semantic-ui.com/behaviors/form.html
	 */
	validateRules: {
		textField: {
			identifier: 'text_field',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.module_template_ValidateValueIsEmpty,
				},
			],
		},
		areaField: {
			identifier: 'text_area_field',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.module_template_ValidateValueIsEmpty,
				},
			],
		},
		passwordField: {
			identifier: 'password_field',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.module_template_ValidateValueIsEmpty,
				},
			],
		},
	},
	/**
	 * On page load init some Semantic UI library
	 */
	initialize() {
		ModuleCTIClientV5Modify.$checkBoxes.checkbox();
		ModuleCTIClientV5Modify.$dropDowns.dropdown();
		ModuleCTIClientV5Modify.initializeForm();
	},

	/**
	 * We can modify some data before form send
	 * @param settings
	 * @returns {*}
	 */
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = ModuleCTIClientV5Modify.$formObj.form('get values');
		return result;
	},

	/**
	 * Some actions after forms send
	 */
	cbAfterSendForm() {

	},
	/**
	 * Initialize form parameters
	 */
	initializeForm() {
		Form.$formObj = ModuleCTIClientV5Modify.$formObj;
		Form.url = `${globalRootUrl}modulecticlient-v5/modulecticlient-v5/save`;
		Form.validateRules = ModuleCTIClientV5Modify.validateRules;
		Form.cbBeforeSendForm = ModuleCTIClientV5Modify.cbBeforeSendForm;
		Form.cbAfterSendForm = ModuleCTIClientV5Modify.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	ModuleCTIClientV5Modify.initialize();
});

