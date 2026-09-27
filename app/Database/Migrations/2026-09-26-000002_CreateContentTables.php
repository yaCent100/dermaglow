<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Blog, newsletter, avis clients, messages de contact.
 */
class CreateContentTables extends Migration
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
        // --- Blog ------------------------------------------------------------
        $this->forge->addField([
            'id'               => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'title'            => ['type' => 'VARCHAR', 'constraint' => 200],
            'slug'             => ['type' => 'VARCHAR', 'constraint' => 220],
            'category'         => ['type' => 'VARCHAR', 'constraint' => 80, 'null' => true],
            'excerpt'          => ['type' => 'VARCHAR', 'constraint' => 400, 'null' => true],
            'content'          => ['type' => 'TEXT', 'null' => true], // Markdown
            'cover_image'      => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'meta_title'       => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => true],
            'meta_description' => ['type' => 'VARCHAR', 'constraint' => 300, 'null' => true],
            'status'           => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'draft'], // draft | published
            'is_featured'      => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'reading_minutes'  => ['type' => 'INT', 'unsigned' => true, 'default' => 1],
            'views'            => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'author_name'      => ['type' => 'VARCHAR', 'constraint' => 120, 'null' => true],
            'published_at'     => ['type' => 'DATETIME', 'null' => true],
            ...$this->timestamps(),
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('slug');
        $this->forge->addKey(['status', 'published_at']);
        $this->forge->createTable('posts', true);

        // --- Newsletter --------------------------------------------------------
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'email'           => ['type' => 'VARCHAR', 'constraint' => 190],
            'first_name'      => ['type' => 'VARCHAR', 'constraint' => 80, 'null' => true],
            'status'          => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'pending'], // pending | active | unsubscribed
            'token'           => ['type' => 'CHAR', 'constraint' => 40],
            'source'          => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true],
            'confirmed_at'    => ['type' => 'DATETIME', 'null' => true],
            'unsubscribed_at' => ['type' => 'DATETIME', 'null' => true],
            ...$this->timestamps(),
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('email');
        $this->forge->addUniqueKey('token');
        $this->forge->createTable('subscribers', true);

        $this->forge->addField([
            'id'               => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'subject'          => ['type' => 'VARCHAR', 'constraint' => 200],
            'preheader'        => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => true],
            'content'          => ['type' => 'TEXT'], // Markdown
            'status'           => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'draft'], // draft | sent
            'recipients_count' => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'sent_at'          => ['type' => 'DATETIME', 'null' => true],
            ...$this->timestamps(),
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('campaigns', true);

        // --- Avis clients ---------------------------------------------------------
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'booking_id'  => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'service_id'  => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'name'        => ['type' => 'VARCHAR', 'constraint' => 100],
            'email'       => ['type' => 'VARCHAR', 'constraint' => 190, 'null' => true],
            'rating'      => ['type' => 'TINYINT', 'constraint' => 1, 'unsigned' => true],
            'title'       => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'comment'     => ['type' => 'TEXT'],
            'status'      => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'pending'], // pending | approved | rejected
            'is_verified' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'reply'       => ['type' => 'TEXT', 'null' => true],
            'replied_at'  => ['type' => 'DATETIME', 'null' => true],
            ...$this->timestamps(),
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey(['status', 'created_at']);
        $this->forge->createTable('reviews', true);

        // --- Messages du formulaire de contact -----------------------------------
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 120],
            'email'      => ['type' => 'VARCHAR', 'constraint' => 190],
            'phone'      => ['type' => 'VARCHAR', 'constraint' => 40, 'null' => true],
            'subject'    => ['type' => 'VARCHAR', 'constraint' => 190, 'null' => true],
            'message'    => ['type' => 'TEXT'],
            'read_at'    => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('contact_messages', true);
    }

    public function down(): void
    {
        foreach (['contact_messages', 'reviews', 'campaigns', 'subscribers', 'posts'] as $t) {
            $this->forge->dropTable($t, true);
        }
    }
}
