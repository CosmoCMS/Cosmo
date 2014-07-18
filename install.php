<?php

/**
 * Install Cosmo CMS. Delete this page after installing
 */

if($_POST)
{
    // Catch variables from form
    ini_set('display_errors', true);
    error_reporting(E_ALL);
    // Write settings to config file
    $fp = fopen('config.php', 'w');
    echo $fp;
    fwrite($fp, '<?php
    
    $salt = "j38fjJ*#jg2";
    
    $pdo = new PDO("mysql:host='. $_POST['host'] .';dbname='. $_POST['name'] .';charset=utf8", "'. $_POST['username'] .'", "'. $_POST['password'] .'");
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
?>');
    fclose($fp);
    echo chmod('config.php', 0755);
    /*
    // Install database
    $pdo = new PDO("mysql:host=$host;dbname=$dbName", $username, $password);
    
    $statements = file_get_contents('install.sql');
    $statements = explode(';', $statements);

    foreach ($statements as $statement) {
        if (trim($statement) != '') {
            $stmt = $pdo->prepare($statement);
            $stmt->execute();
        }
    }
     * 
     */
}

?>
<div>
    <form action="" method="POST">
        Host<br />
        <input type="text" name="host" value="localhost"><br />
        Database name<br />
        <input type="text" name="name"><br />
        Username<br />
        <input type="text" name="username"><br />
        Password<br />
        <input type="password" name="password"><br />
        Database Host<br />
        <input type="text" name="host" value="localhost"> (You probably won't have to change this)<br />
        Prefix<br />
        <input type="text" name="prefix" value="cosmo_">If you want multiple installations on the same database, change this.<br />
        <button type="submit">Submit</button>
    </form>
</div>
<div>
    <form action="" method="POST">
        Site Title<br />
        <input type="text" name="title" value="My Cosmo Site"><br />
        Username<br />
        <input type="text" value="admin"><br />
        Password<br />
        <input type="password" name="password"> (if left blank, we will generate a password for you)<br />
        <input type="password" name="password2"> (password again)<br />
        Email<br />
        <input type="text" name="email" value="admin@example.com"><br />
        <button type="submit">Submit</button>
    </form>
</div>