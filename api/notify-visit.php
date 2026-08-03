<?php
/**
 * Proxy de notification Discord — infos enrichies (appareil, lieu, provenance).
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$configPath = __DIR__ . '/config.php';
if (!is_readable($configPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Config manquante']);
    exit;
}

$config = require $configPath;
$webhook = trim((string) ($config['discord_webhook_url'] ?? ''));
$rateLimit = (int) ($config['rate_limit_seconds'] ?? 1800);

if ($webhook === '' || str_contains($webhook, 'COLLER_ICI') || !filter_var($webhook, FILTER_VALIDATE_URL)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Webhook Discord non configuré']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw ?: '{}', true);
if (!is_array($payload)) {
    $payload = [];
}

function clean_str(mixed $value, int $max): string
{
    return substr(preg_replace('/[\x00-\x1F\x7F]/', '', (string) $value), 0, $max);
}

function client_ip(): string
{
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP']
        ?? $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['REMOTE_ADDR']
        ?? 'inconnu';
    if (str_contains((string) $ip, ',')) {
        $ip = trim(explode(',', (string) $ip)[0]);
    }
    return (string) $ip;
}

function is_local_ip(string $ip): bool
{
    return $ip === '127.0.0.1'
        || $ip === '::1'
        || str_starts_with($ip, '192.168.')
        || str_starts_with($ip, '10.')
        || str_starts_with($ip, '172.');
}

function parse_user_agent(string $ua): array
{
    $browser = 'Inconnu';
    $os = 'Inconnu';
    $device = 'Ordinateur';

    if (preg_match('/Edg\/([\d.]+)/i', $ua, $m)) {
        $browser = 'Microsoft Edge ' . $m[1];
    } elseif (preg_match('/OPR\/([\d.]+)|Opera\/([\d.]+)/i', $ua, $m)) {
        $browser = 'Opera ' . ($m[1] !== '' ? $m[1] : $m[2]);
    } elseif (preg_match('/Chrome\/([\d.]+)/i', $ua, $m) && !str_contains($ua, 'Edg/')) {
        $browser = 'Chrome ' . $m[1];
    } elseif (preg_match('/Firefox\/([\d.]+)/i', $ua, $m)) {
        $browser = 'Firefox ' . $m[1];
    } elseif (preg_match('/Safari\/([\d.]+)/i', $ua) && preg_match('/Version\/([\d.]+)/i', $ua, $m)) {
        $browser = 'Safari ' . $m[1];
    } elseif (str_contains($ua, 'PowerShell') || str_contains($ua, 'curl') || str_contains($ua, 'python')) {
        $browser = 'Outil / bot (pas un navigateur)';
        $device = 'Test technique';
    }

    if (str_contains($ua, 'Windows NT 10')) {
        $os = 'Windows 10 / 11';
    } elseif (str_contains($ua, 'Windows')) {
        $os = 'Windows';
    } elseif (str_contains($ua, 'Mac OS X') || str_contains($ua, 'Macintosh')) {
        $os = 'macOS';
    } elseif (str_contains($ua, 'Android')) {
        $os = 'Android';
        $device = 'Mobile';
    } elseif (str_contains($ua, 'iPhone') || str_contains($ua, 'iPad')) {
        $os = 'iOS / iPadOS';
        $device = str_contains($ua, 'iPad') ? 'Tablette' : 'Mobile';
    } elseif (str_contains($ua, 'Linux')) {
        $os = 'Linux';
    }

    if (preg_match('/Mobile|Android|iPhone/i', $ua) && $device === 'Ordinateur') {
        $device = 'Mobile';
    }

    return compact('browser', 'os', 'device');
}

function describe_referrer(string $referrer): string
{
    if ($referrer === '') {
        return 'Accès direct (URL tapée, favori, ou lien sans origine)';
    }

    $host = parse_url($referrer, PHP_URL_HOST) ?: $referrer;
    $host = strtolower((string) $host);

    $map = [
        'google.' => 'Google (recherche)',
        'bing.' => 'Bing (recherche)',
        'duckduckgo.' => 'DuckDuckGo',
        'linkedin.' => 'LinkedIn',
        'github.' => 'GitHub',
        'facebook.' => 'Facebook',
        'instagram.' => 'Instagram',
        'twitter.' => 'X / Twitter',
        'x.com' => 'X / Twitter',
        'youtube.' => 'YouTube',
        'mail.google' => 'Gmail',
        'outlook.' => 'Outlook',
    ];

    foreach ($map as $needle => $label) {
        if (str_contains($host, $needle)) {
            return $label . "\n`" . $referrer . '`';
        }
    }

    return 'Lien externe (`' . $host . "`)\n`" . $referrer . '`';
}

function lookup_geo(string $ip): string
{
    if (is_local_ip($ip) || !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        return 'Local / réseau privé (pas de géolocalisation)';
    }

    $url = 'http://ip-api.com/json/' . rawurlencode($ip) . '?fields=status,country,regionName,city,isp,org,timezone&lang=fr';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 3,
        CURLOPT_CONNECTTIMEOUT => 2,
    ]);
    $json = curl_exec($ch);
    curl_close($ch);

    if ($json === false) {
        return 'Indisponible';
    }

    $data = json_decode($json, true);
    if (!is_array($data) || ($data['status'] ?? '') !== 'success') {
        return 'Indisponible';
    }

    $parts = array_filter([
        $data['city'] ?? null,
        $data['regionName'] ?? null,
        $data['country'] ?? null,
    ]);
    $place = $parts !== [] ? implode(', ', $parts) : 'Lieu inconnu';
    $isp = $data['isp'] ?? ($data['org'] ?? '');
    $tz = $data['timezone'] ?? '';

    $lines = [$place];
    if ($isp !== '') {
        $lines[] = 'FAI : ' . $isp;
    }
    if ($tz !== '') {
        $lines[] = 'Fuseau : ' . $tz;
    }
    return implode("\n", $lines);
}

$ip = client_ip();

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

$rateFile = $dataDir . '/rate_' . hash('sha256', $ip) . '.json';
$now = time();
if (is_readable($rateFile)) {
    $prev = json_decode((string) file_get_contents($rateFile), true);
    $last = (int) ($prev['ts'] ?? 0);
    if ($last > 0 && ($now - $last) < $rateLimit) {
        http_response_code(200);
        echo json_encode(['ok' => true, 'skipped' => 'rate_limit']);
        exit;
    }
}
file_put_contents($rateFile, json_encode(['ts' => $now]), LOCK_EX);

$page = clean_str($payload['page'] ?? '', 300);
$referrer = clean_str($payload['referrer'] ?? '', 300);
$ua = clean_str($_SERVER['HTTP_USER_AGENT'] ?? '', 250);
$lang = clean_str($payload['lang'] ?? '', 40);
$langs = clean_str($payload['langs'] ?? '', 80);
$screen = clean_str($payload['screen'] ?? '', 40);
$viewport = clean_str($payload['viewport'] ?? '', 40);
$timezone = clean_str($payload['timezone'] ?? '', 60);
$platform = clean_str($payload['platform'] ?? '', 60);

if ($page === '') {
    $page = '(page inconnue)';
}

$uaInfo = parse_user_agent($ua);
$geo = lookup_geo($ip);
$source = describe_referrer($referrer);
$localNote = is_local_ip($ip);

$tzParis = new DateTimeZone('Europe/Paris');
$when = (new DateTimeImmutable('now', $tzParis))->format('d/m/Y H:i:s');

$langLine = $lang !== '' ? $lang : '—';
if ($langs !== '' && $langs !== $lang) {
    $langLine .= ' (' . $langs . ')';
}

$displayLine = $screen !== '' ? 'Écran ' . $screen : '—';
if ($viewport !== '') {
    $displayLine .= ' · Fenêtre ' . $viewport;
}

$fields = [
    ['name' => 'Page', 'value' => '`' . $page . '`', 'inline' => false],
    ['name' => 'Provenance', 'value' => $source, 'inline' => false],
    ['name' => 'Localisation', 'value' => $geo, 'inline' => false],
    ['name' => 'IP', 'value' => '`' . $ip . '`', 'inline' => true],
    ['name' => 'Appareil', 'value' => $uaInfo['device'], 'inline' => true],
    ['name' => 'Système', 'value' => $uaInfo['os'], 'inline' => true],
    ['name' => 'Navigateur', 'value' => $uaInfo['browser'], 'inline' => true],
    ['name' => 'Plateforme', 'value' => $platform !== '' ? $platform : '—', 'inline' => true],
    ['name' => 'Langue', 'value' => $langLine, 'inline' => true],
    ['name' => 'Affichage', 'value' => $displayLine, 'inline' => false],
    ['name' => 'Fuseau visiteur', 'value' => $timezone !== '' ? $timezone : '—', 'inline' => true],
];

$content = $localNote
    ? '🧪 Visite locale / test (peu d’infos géographiques).'
    : '👀 Nouvelle visite sur le portfolio.';

$embed = [
    'title' => $localNote ? 'Visite locale (test)' : 'Nouvelle visite sur le portfolio',
    'color' => $localNote ? 0xf59e0b : 0x2563eb,
    'fields' => $fields,
    'footer' => ['text' => 'jacques-website · ' . $when],
];

$body = json_encode([
    'username' => 'Portfolio Visites',
    'content' => $content,
    'embeds' => [$embed],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$ch = curl_init($webhook);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 8,
]);
$response = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false || $status < 200 || $status >= 300) {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'Discord unreachable',
        'detail' => $error !== '' ? $error : ('HTTP ' . $status),
    ]);
    exit;
}

echo json_encode(['ok' => true]);
