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
    $extra = $row['extra'];
    if(strpos($extra, '/uploads/') === 0)
    {
        $stmt2 = $pdo->prepare('SELECT * FROM files WHERE filename=?');
        $data2 = array($extra);
        $stmt2->execute($data2);
        $stmt2->setFetchMode(PDO::FETCH_ASSOC);
        while($row2 = $stmt2->fetch())
        {
            $newExtra = array(
                'title' => $row2['title'],
                'href' => $row2['href'],
                'alt' => $row2['alt'],
                'class' => $row2['class'],
                'src' => $extra
            );
            $stmt3 = $pdo->prepare('UPDATE content_extras SET extra=? WHERE id=?');
            $data3 = array(json_encode($newExtra), $row['id']);
            $stmt3->execute($data3);
        }
    }
}
echo 'finished';
?>