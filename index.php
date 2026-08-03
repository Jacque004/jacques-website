<?php
/**
 * Point d'entrée PHP — sert le portfolio (évite l'ancienne redirection vers View/).
 */
header('Content-Type: text/html; charset=UTF-8');
readfile(__DIR__ . '/index.html');
