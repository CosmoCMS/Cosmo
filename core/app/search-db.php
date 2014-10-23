<?php

include_once 'autoload.php';

$search = 'giant';

$tables = array('blocks', 'blocks_requirements', 'comments', 'content_extras', 'content_tags', 'files', 'files_tags', 'menus', 'misc', 'modules', 'revisions', 'revisions_extras', 'roles', 'roles_permissions', 'roles_users', 'settings', 'tokens', 'users');

foreach($tables as $table){
    
    $stmt = $pdo->prepare("SELECT * FROM $table");
    $stmt->execute();
    $stmt->setFetchMode(PDO::FETCH_ASSOC);
    while($row = $stmt->fetch())
    {
        foreach($row as $name=>$val)
        {
            if($name === 'id')
                $id = $val;
            
            if(strpos($val, $search))
                echo ' Table: ' . $table . ' ID: ' . $id . ' Column: ' . $name . "<br />";
        }
    }
}

?>