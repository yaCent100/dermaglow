<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Filters\AdminAuth;

class Auth extends BaseController
{
    public function login()
    {
        $in = $this->input();
        if ($r = $this->invalid($in, ['email' => 'required|valid_email', 'password' => 'required'])) {
            return $r;
        }
        $user = $this->db->table('users')->where('email', strtolower(trim($in['email'])))->get()->getRowArray();
        if (! $user || ! password_verify($in['password'], $user['password_hash'])) {
            usleep(400000);

            return $this->error('E-mail ou mot de passe incorrect.', 401);
        }

        $token = random_token(32);
        $now   = date('Y-m-d H:i:s');
        $this->db->table('auth_tokens')->where('expires_at <', $now)->delete();
        $this->db->table('auth_tokens')->insert([
            'user_id'    => $user['id'],
            'token_hash' => hash('sha256', $token),
            'expires_at' => date('Y-m-d H:i:s', strtotime(! empty($in['remember']) ? '+30 days' : '+12 hours')),
            'created_at' => $now,
        ]);
        $this->db->table('users')->where('id', $user['id'])->update(['last_login_at' => $now]);

        return $this->ok([
            'token' => $token,
            'user'  => ['id' => (int) $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role']],
        ]);
    }

    public function me()
    {
        $u = AdminAuth::$user;

        return $this->ok(['id' => (int) $u['id'], 'name' => $u['name'], 'email' => $u['email'], 'role' => $u['role']]);
    }

    public function logout()
    {
        $this->db->table('auth_tokens')->where('id', AdminAuth::$user['token_id'])->delete();

        return $this->ok(['ok' => true]);
    }

    public function password()
    {
        $in = $this->input();
        if ($r = $this->invalid($in, [
            'current'  => 'required',
            'password' => 'required|min_length[10]',
        ], ['password' => ['min_length' => 'Le nouveau mot de passe doit contenir au moins 10 caractères.']])) {
            return $r;
        }
        $user = $this->db->table('users')->where('id', AdminAuth::$user['id'])->get()->getRowArray();
        if (! password_verify($in['current'], $user['password_hash'])) {
            return $this->error('Mot de passe actuel incorrect.', 422);
        }
        $this->db->table('users')->where('id', $user['id'])->update([
            'password_hash' => password_hash($in['password'], PASSWORD_DEFAULT),
            'updated_at'    => date('Y-m-d H:i:s'),
        ]);
        // Déconnecte les autres sessions
        $this->db->table('auth_tokens')->where('user_id', $user['id'])->where('id !=', AdminAuth::$user['token_id'])->delete();

        return $this->ok(['ok' => true]);
    }
}
