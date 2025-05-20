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

namespace Modules\ModuleCTIClientV5\Models;

use MikoPBX\Modules\Models\ModulesModelsBase;


/**
 * Class ModuleCTIClientV5
 *
 * Represents the CTI Client module.
 */
class ModuleCTIClientV5 extends ModulesModelsBase
{

    /**
     * @Primary
     * @Identity
     * @Column(type='integer', nullable=false)
     */
    public $id;

    /**
     * @var string|null Debug mode of the module
     *
     * @Column(type='string', length=1, nullable=true, default='0')
     */
    public ?string $debug_mode = '0';

    /**
     * @var string|null AMI password for the created manager
     *
     * @Column(type='string', nullable=true, default='')
     */
    public ?string $ami_password = '';

    /**
     * @var string|null Asterisk UID for the created manager
     *
     * @Column(type='string', nullable=true, default='')
     */
    public ?string $asterisk_uid = '';

    /**
     * @var string|null Auth token for auto-configuration
     *
     * @Column(type='string', nullable=true, default='')
     */
    public ?string $authorization_token = '';

    /**
     * @var string|null Whether to set CallerID based on data from 1C
     *
     * @Column(type='string', length=1, nullable=true, default='0')
     */
    public ?string $setup_caller_id = '1';

    /**
     * @var string|null Whether to transliterate CallerID
     *
     * @Column(type='string', length=1, nullable=true, default='0')
     */
    public ?string $transliterate_caller_id = '0';

    /**
     * Initialize model for module
     * @return void
     */
    public function initialize(): void
    {
        $this->setSource('m_ModuleCTIClientV5');
        parent::initialize();
    }
}