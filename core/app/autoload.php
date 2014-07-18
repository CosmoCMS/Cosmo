<?php

$host = 'localhost';
$dbName = 'jddunn9_knowledge'; # Database name
$username = 'JDDunn9';
$password = 'panther8e';
$prefix = '';
$salt = 'j38fjJ*#jg2';

$pdo = new PDO("mysql:host=$host;dbname=$dbName;charset=utf8", $username, $password);
$pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

?>