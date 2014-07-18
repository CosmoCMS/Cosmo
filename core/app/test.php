<?php

include_once 'autoload.php';
require_once 'Cosmo.class.php';
$Cosmo = new Cosmo($pdo, $prefix, $salt);

$stmt = $pdo->prepare("SELECT * FROM content_extras WHERE name='main-gallery'");
$stmt->execute();
$stmt->setFetchMode(PDO::FETCH_ASSOC);

while($row = $stmt->fetch())
{
    if(strpos($row['extra'], ','))
    {
        $images = explode(',', $row['extra']);
        $records = array();
        foreach($images as $id)
        {
            $record = $Cosmo->fileReadRecord($id);
            $record['tags'] = $Cosmo->fileTagsRead($id);
            $records[] = $record;
        }
        $stmt2 = $pdo->prepare("UPDATE content_extras SET extra=? WHERE id=?");
        $data2 = array(json_encode($records), $row['id']);
        $stmt2->execute($data2);
        $stmt2->setFetchMode(PDO::FETCH_ASSOC);
    }
}
echo 'Finished';

?>