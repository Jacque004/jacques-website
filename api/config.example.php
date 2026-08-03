<?php
/**
 * Copiez ce fichier en config.php et collez votre URL de webhook Discord.
 *
 * Créer un webhook : Salon Discord → Paramètres → Intégrations → Webhooks → Nouveau webhook
 */
return [
    'discord_webhook_url' => 'https://discord.com/api/webhooks/ID/TOKEN',
    // Une seule notification par IP toutes les X secondes (évite le spam au refresh)
    'rate_limit_seconds' => 1800,
];
