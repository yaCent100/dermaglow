<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Tables principales : admin, soins, réservations, réglages.
 * Compatible MySQL / MariaDB et SQLite.
 */
class CreateCoreTables extends Migration
{
    private function timestamps(): array
    {
        return [
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ];
    }

    public function up(): void
    {
        // --- Utilisateurs admin -------------------------------------------
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'          => ['type' => 'VARCHAR', 'constraint' => 120],
            'email'         => ['type' => 'VARCHAR', 'constraint' => 190],
            'password_hash' => ['type' => 'VARCHAR', 'constraint' => 255],
            'role'          => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'admin'],
            'last_login_at' => ['type' => 'DATETIME', 'null' => true],
            ...$this->timestamps(),
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('email');
        $this->forge->createTable('users', true);

        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'user_id'    => ['type' => 'INT', 'unsigned' => true],
            'token_hash' => ['type' => 'CHAR', 'constraint' => 64],
            'expires_at' => ['type' => 'DATETIME'],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('token_hash');
        $this->forge->addKey('user_id');
        $this->forge->createTable('auth_tokens', true);

        // --- Catalogue de soins ---------------------------------------------
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'        => ['type' => 'VARCHAR', 'constraint' => 120],
            'slug'        => ['type' => 'VARCHAR', 'constraint' => 140],
            'subtitle'    => ['type' => 'VARCHAR', 'constraint' => 190, 'null' => true],
            'description' => ['type' => 'TEXT', 'null' => true],
            'position'    => ['type' => 'INT', 'default' => 0],
            'is_active'   => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            ...$this->timestamps(),
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('slug');
        $this->forge->createTable('service_categories', true);

        $this->forge->addField([
            'id'                => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'category_id'       => ['type' => 'INT', 'unsigned' => true],
            'name'              => ['type' => 'VARCHAR', 'constraint' => 150],
            'slug'              => ['type' => 'VARCHAR', 'constraint' => 170],
            'short_description' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'description'       => ['type' => 'TEXT', 'null' => true],
            'price_cents'       => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'duration_min'      => ['type' => 'INT', 'unsigned' => true, 'default' => 30],
            'deposit_cents'     => ['type' => 'INT', 'unsigned' => true, 'null' => true], // null = règle globale
            'image'             => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'is_featured'       => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'is_active'         => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            'position'          => ['type' => 'INT', 'default' => 0],
            ...$this->timestamps(),
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('slug');
        $this->forge->addKey('category_id');
        $this->forge->createTable('services', true);

        // --- Réservations ----------------------------------------------------
        $this->forge->addField([
            'id'                    => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'reference'             => ['type' => 'VARCHAR', 'constraint' => 16],
            'manage_token'          => ['type' => 'CHAR', 'constraint' => 40],
            'first_name'            => ['type' => 'VARCHAR', 'constraint' => 80],
            'last_name'             => ['type' => 'VARCHAR', 'constraint' => 80],
            'email'                 => ['type' => 'VARCHAR', 'constraint' => 190],
            'phone'                 => ['type' => 'VARCHAR', 'constraint' => 40],
            'notes'                 => ['type' => 'TEXT', 'null' => true],
            'admin_notes'           => ['type' => 'TEXT', 'null' => true],
            'start_at'              => ['type' => 'DATETIME'],
            'end_at'                => ['type' => 'DATETIME'],
            'total_cents'           => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'deposit_cents'         => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            // pending_payment | confirmed | completed | cancelled | no_show | expired
            'status'                => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'pending_payment'],
            // unpaid | deposit_paid | paid | refunded
            'payment_status'        => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'unpaid'],
            'source'                => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'web'],
            'stripe_session_id'     => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'stripe_payment_intent' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'deposit_paid_at'       => ['type' => 'DATETIME', 'null' => true],
            'paid_on_site_at'       => ['type' => 'DATETIME', 'null' => true],
            'paid_on_site_method'   => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'cancelled_at'          => ['type' => 'DATETIME', 'null' => true],
            'cancel_reason'         => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'refunded_cents'        => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'reminder_sent_at'      => ['type' => 'DATETIME', 'null' => true],
            'review_requested_at'   => ['type' => 'DATETIME', 'null' => true],
            'newsletter_optin'      => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'expires_at'            => ['type' => 'DATETIME', 'null' => true],
            ...$this->timestamps(),
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('reference');
        $this->forge->addKey(['start_at', 'status']);
        $this->forge->addKey('email');
        $this->forge->createTable('bookings', true);

        $this->forge->addField([
            'id'           => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'booking_id'   => ['type' => 'INT', 'unsigned' => true],
            'service_id'   => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'service_name' => ['type' => 'VARCHAR', 'constraint' => 150],
            'price_cents'  => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'duration_min' => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('booking_id');
        $this->forge->createTable('booking_items', true);

        // --- Fermetures exceptionnelles (congés, jours fériés) ---------------
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'start_date' => ['type' => 'DATE'],
            'end_date'   => ['type' => 'DATE'],
            'reason'     => ['type' => 'VARCHAR', 'constraint' => 190, 'null' => true],
            ...$this->timestamps(),
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('closures', true);

        // --- Réglages clé / valeur -------------------------------------------
        $this->forge->addField([
            'key'        => ['type' => 'VARCHAR', 'constraint' => 80],
            'value'      => ['type' => 'TEXT', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('key', true);
        $this->forge->createTable('settings', true);
    }

    public function down(): void
    {
        foreach (['settings', 'closures', 'booking_items', 'bookings', 'services', 'service_categories', 'auth_tokens', 'users'] as $t) {
            $this->forge->dropTable($t, true);
        }
    }
}
