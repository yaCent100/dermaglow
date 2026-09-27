<?php

namespace App\Commands;

use App\Controllers\System;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

/**
 * php spark dermaglow:tasks   (à planifier toutes les heures via cron si SSH disponible)
 */
class Tasks extends BaseCommand
{
    protected $group       = 'DermaGlow';
    protected $name        = 'dermaglow:tasks';
    protected $description = 'Libère les paiements abandonnés et envoie les rappels J-1.';

    public function run(array $params)
    {
        CLI::write(json_encode(System::runTasks(), JSON_UNESCAPED_UNICODE));
    }
}
