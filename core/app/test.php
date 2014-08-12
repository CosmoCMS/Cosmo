<?php

include_once 'autoload.php';
// require_once 'Cosmo.class.php';
// $Cosmo = new Cosmo($pdo, $prefix, $salt);

$stmt = $pdo->prepare("SELECT * FROM mls_images");
$stmt->execute();
$stmt->setFetchMode(PDO::FETCH_ASSOC);
while($row = $stmt->fetch())
{
    if(strpos($row['image'], '../') === 0)
    {
        $newImage = str_replace('../', '', $row['image']);
        
        $stmt3 = $pdo->prepare('SELECT * FROM mls_images WHERE image=?');
        $data3 = array($newImage);
        $stmt3->execute($data3);
        if($stmt3->rowCount() === 1){
            $stmt4 = $pdo->prepare('DELETE FROM mls_images WHERE id=?');
            $data4 = array($row['id']);
            $stmt4->execute($data4);
        } else {
        
            $stmt2 = $pdo->prepare("UPDATE mls_images SET image=? WHERE id=?");
            $data2 = array($newImage, $row['id']);
            try {
                $stmt2->execute($data2);
            } catch (PDOException $e) {
                echo $e->getMessage() . '<br />';
            }
        }
    }
}

echo 'Finished';

?>