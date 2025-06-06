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

namespace Modules\ModuleCTIClientV5\App\Forms;

use MikoPBX\AdminCabinet\Forms\BaseForm;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Select;

class ModuleCTIClientV5Form extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {

        // id
        $this->add(new Hidden('id', ['value' => $entity->id]));

        // text_field
        $this->add(new Text('text_field'));

        // text_area_field
        $this->addTextArea(
            'text_area_field',
            $entity->text_area_field ?? '',
            90,
            ['placeholder' => 'There is placeholder text']
        );

        // password_field
        $this->add(new Password('password_field'));

        // integer_field
        $this->add(new Numeric('integer_field', [
            'maxlength'    => 2,
            'style'        => 'width: 80px;',
            'defaultValue' => 3,
        ]));

        // checkbox_field
        $this->addCheckBox('checkbox_field', intval($entity->checkbox_field) === 1);

        // toggle_field
        $this->addCheckBox('toggle_field', intval($entity->toggle_field) === 1);

        // dropdown_field
        $providers = new Select('dropdown_field', $options['providers'], [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => false,
            'class'    => 'ui selection dropdown provider-select',
        ]);
        $this->add($providers);
    }

    /**
     * Adds a checkbox to the form field with the given name.
     * Can be deleted if the module depends on MikoPBX later than 2024.3.0
     *
     * @param string $fieldName The name of the form field.
     * @param bool $checked Indicates whether the checkbox is checked by default.
     * @param string $checkedValue The value assigned to the checkbox when it is checked.
     * @return void
     */
    public function addCheckBox(string $fieldName, bool $checked, string $checkedValue = 'on'): void
    {
        $checkAr = ['value' => null];
        if ($checked) {
            $checkAr = ['checked' => $checkedValue,'value' => $checkedValue];
        }
        $this->add(new Check($fieldName, $checkAr));
    }
}
