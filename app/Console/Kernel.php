<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use Illuminate\Support\Facades\Log;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * These jobs run in a default, single-server configuration.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // Exécuter la commande à 9h00 et 14h00
        $schedule->command('tickets:deadline-reminder')
            ->dailyAt('09:00')
            ->withoutOverlapping()
            ->onFailure(function () {
                Log::error('Échec de l\'envoi des rappels de tickets à échéance');
            })
            ->onSuccess(function () {
                Log::info('Rappels de tickets à échéance envoyés avec succès');
            });

        $schedule->command('tickets:deadline-reminder')
            ->dailyAt('14:00')
            ->withoutOverlapping()
            ->onFailure(function () {
                Log::error('Échec de l\'envoi des rappels de tickets à échéance');
            })
            ->onSuccess(function () {
                Log::info('Rappels de tickets à échéance envoyés avec succès');
            });
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
} 