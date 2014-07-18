<?php

/**
 * Controller that connects the front-end to the back-end
 */

require_once 'autoload.php';
require_once 'Cosmo.class.php';
$Cosmo = new Cosmo($pdo, $prefix, $salt);

$stmt = $pdo->prepare('SELECT * FROM content_extras');
$stmt->execute();
$stmt->setFetchMode(PDO::FETCH_ASSOC);
while($row = $stmt->fetch())
{
    if($row['extra'][0] === '[')
    {
        $extra = json_decode($row['extra']);
        foreach($extra as $image)
        {
            $stmt2 = $pdo->prepare('SELECT * FROM files WHERE filename=? LIMIT 1');
            $data2 = array($image->url);
            $stmt2->execute($data2);
            $stmt2->setFetchMode(PDO::FETCH_ASSOC);
            $row2 = $stmt2->fetch();
            $image->responsive = $row2['responsive'];
        }
        
        $extra = json_encode($extra);
        
        $stmt2 = $pdo->prepare('UPDATE content_extras SET extra=? WHERE id=?');
        $data2 = array($extra, $row['id']);
        $stmt2->execute($data2);
    }
}

echo 'finished';

?>