<?php

require_once 'autoload.php';

// Check if any pages should be published
$stmt = $pdo->prepare("SELECT * FROM content WHERE published='schedule' && published_date <= ?");
$data = array(time());
$stmt->execute($data);
$stmt->setFetchMode(PDO::FETCH_ASSOC);

while($row = $stmt->fetch())
{
    $stmt2 = $pdo->prepare("UPDATE content SET published='Y' WHERE id=?");
    $data2 = array($row['id']);
    $stmt2->execute($data2);
}

?>