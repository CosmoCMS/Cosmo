<?php

/**
 * Controller that connects the front-end to the back-end
 */

require_once 'autoload.php';
require_once 'Cosmo.class.php';
$Cosmo = new Cosmo($pdo, $prefix, $salt);

$stmt = $pdo->prepare('SELECT * FROM files');
$stmt->execute();
$stmt->setFetchMode(PDO::FETCH_ASSOC);
while($row = $stmt->fetch())
{
    $file = $row['filename'];
    $small = '../..' . str_replace('.', '-320.', $file);
    $medium = '../..' . str_replace('.', '-512.', $file);
    $large = '../..' . str_replace('.', '-1024.', $file);
    $xlarge = '../..' . str_replace('.', '-2048.', $file);
    if(is_file($small) && is_file($medium) && is_file($large) && is_file($xlarge))
    {
        $stmt2 = $pdo->prepare('UPDATE files SET responsive=? WHERE id=?');
        $data2 = array('yes', $row['id']);
        $stmt2->execute($data2);
    }
}
echo 'finished';
?>