<?php

if (! function_exists('euros')) {
    /** 12000 -> "120 €" ; 12050 -> "120,50 €" */
    function euros(int|string|null $cents): string
    {
        $v = ((int) $cents) / 100;

        return (fmod($v, 1.0) === 0.0 ? number_format($v, 0, ',', ' ') : number_format($v, 2, ',', ' ')) . ' €';
    }
}

if (! function_exists('fr_date')) {
    /** "2026-10-02 14:30:00" -> "vendredi 2 octobre 2026" */
    function fr_date(?string $datetime, bool $withTime = false): string
    {
        if (! $datetime) {
            return '';
        }
        $ts     = strtotime($datetime);
        $days   = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        $months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        $out    = $days[(int) date('w', $ts)] . ' ' . (int) date('j', $ts) . ' ' . $months[(int) date('n', $ts) - 1] . ' ' . date('Y', $ts);

        return $withTime ? $out . ' à ' . date('H\hi', $ts) : $out;
    }
}

if (! function_exists('random_token')) {
    function random_token(int $bytes = 20): string
    {
        return bin2hex(random_bytes($bytes));
    }
}

if (! function_exists('md_to_html')) {
    /**
     * Petit convertisseur Markdown -> HTML pour les e-mails (titres, gras, italique,
     * listes, liens, citations, paragraphes). Le site, lui, utilise marked côté navigateur.
     */
    function md_to_html(string $md): string
    {
        $md    = str_replace("\r\n", "\n", trim($md));
        $esc   = static fn ($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
        $inline = static function ($s) use ($esc) {
            $s = $esc($s);
            $s = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $s);
            $s = preg_replace('/(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\w)/s', '<em>$1</em>', $s);
            $s = preg_replace('/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/', '<a href="$2" style="color:#0E1F3D">$1</a>', $s);

            return $s;
        };
        $html = '';
        foreach (preg_split("/\n{2,}/", $md) as $block) {
            $lines = explode("\n", $block);
            if (preg_match('/^(#{1,3})\s+(.*)$/', $block, $m)) {
                $lvl = strlen($m[1]) + 1;
                $html .= "<h{$lvl} style=\"font-family:Georgia,serif;font-weight:500;color:#0E1F3D\">" . $inline($m[2]) . "</h{$lvl}>";
            } elseif (preg_match('/^(\s*[-*]\s+)/', $lines[0])) {
                $html .= '<ul>' . implode('', array_map(static fn ($l) => '<li>' . $inline(preg_replace('/^\s*[-*]\s+/', '', $l)) . '</li>', $lines)) . '</ul>';
            } elseif (preg_match('/^\d+\.\s+/', $lines[0])) {
                $html .= '<ol>' . implode('', array_map(static fn ($l) => '<li>' . $inline(preg_replace('/^\d+\.\s+/', '', $l)) . '</li>', $lines)) . '</ol>';
            } elseif (str_starts_with($block, '>')) {
                $html .= '<blockquote style="border-left:3px solid #B3D5E0;margin:0;padding-left:14px;color:#4A5568">' . $inline(preg_replace('/^>\s?/m', '', $block)) . '</blockquote>';
            } elseif (trim($block) === '---') {
                $html .= '<hr style="border:none;border-top:1px solid #E8DCCF">';
            } else {
                $html .= '<p>' . nl2br($inline($block)) . '</p>';
            }
        }

        return $html;
    }
}
