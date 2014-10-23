<?php

/**
 * Install Cosmo CMS. Delete this page after installing
 */

if($_GET)
{
    // Catch variables from form
    ini_set('display_errors', true);
    error_reporting(E_ALL);
    
    // Generate 128 character salt
    $salt = "";
    
    for ($i=0; $i<128; $i++)
    {
        $random_char = chr(round( mt_rand(33, 125)));
        if($random_char !== "'")
            $salt .= $random_char;
    }
    
    if(!empty($_GET['folder']) && $_GET['folder'] !== 'undefined')
        $folder = $_GET['folder'];
    else
        $folder = '';
    
    if(!empty($_GET['prefix']) && $_GET['prefix'] !== 'undefined')
        $prefix = $_GET['prefix'];
    else
        $prefix = '';
    
    // Write settings to config file
    $fp = fopen('core/app/autoload.php', 'w');
    fwrite($fp, '<?php
    
    $host = \''. $_GET['host'] .'\';
    $dbName = \''. $_GET['name'] .'\'; # Database name
    $username = \''. $_GET['username'] .'\';
    $password = \''. $_GET['password'] .'\';
    $prefix = \''. $prefix .'\'; // e.g. cosmo_
    $folder = define(\'FOLDER\', \''. $folder .'\'); // /subfolder
    $salt = \''. $salt .'\';
    $developerMode = false; // Switching this to true prevents minification/combination of JS/CSS files for better error reporting
    
    $pdo = new PDO("mysql:host=$host;dbname=$dbName;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $username = null;
    
?>');
    fclose($fp);
    
    // Install database
    include 'core/app/autoload.php';
    include 'core/app/Cosmo.class.php';
    $Cosmo = new Cosmo($pdo, $prefix, $salt);
    
    $sqlFile = file_get_contents('install.sql');
    $statements = explode(';', $sqlFile);
    
    // Execute MySQL statements, replacing the prefix
    foreach ($statements as $statement) {
        if(trim($statement) != '') {
            $stmt = $pdo->prepare(str_replace('**prefix**', $prefix, $statement));
            $stmt->execute();
        }
    }
    
    // Setup site info
    $stmt = $pdo->prepare('INSERT INTO '.$prefix.'settings (site_name, email, theme) VALUES (?,?,?)');
    $data = array($_GET['title'], $_GET['email'], 'Pendant');
    $stmt->execute($data);
    
    // Create home page
    $stmt = $pdo->prepare('INSERT INTO '.$prefix.'content (url, type, published) VALUES (?,?,?)');
    $data = array('/', 'index.html', 'Y');
    $stmt->execute($data);
    
    // Create new page
    $stmt = $pdo->prepare('INSERT INTO '.$prefix.'content (url, author, published) VALUES (?,?,?)');
    $data = array('/new', $_GET['username'], 'Y');
    $stmt->execute($data);
    
    // Create admin username/password
    $Cosmo->usersCreate($_GET['adminUsername'], $_GET['email'], $_GET['adminPassword'], 'admin');
}

if(!$_GET):
?>
<html ng-app="app">
    <head>
        <title>Install Cosmo</title>
        <link rel="stylesheet" type="text/css" href="core/css/cosmo-default-style.minify.css">
        <script src="core/js/angular/angular.min.js"></script>
        <script src="core/js/3rd-party/ngDialog.min.js"></script>
        <script>
            angular.module('app', ['ngDialog'])
            
            .run(function(ngDialog){
                ngDialog.open({ template: 'core/html/install.html', showClose: false, closeByEscape: false, closeByDocument: false });
            })
            
            .controller('installationCtrl', function($scope, ngDialog, $http, $sce){
                $scope.install = {};
                $scope.install.prefix = '';
                $scope.install.host = 'localhost';
                $scope.uploadsPermissions = '<?php echo substr(sprintf('%o', fileperms('uploads')), -4); ?>';
                $scope.autoloadPermissions = '<?php echo substr(sprintf('%o', fileperms('core/app/autoload.php')), -4); ?>';
                $scope.htaccess = '<?php echo file_exists('.htaccess');?>';
                
                $scope.submit = function(){
                    if($scope.install.adminPassword === $scope.install.adminPassword2){
                        $http.get('install.php?name='+ $scope.install.dbname +
                                '&host='+ $scope.install.host +
                                '&username='+ $scope.install.username +
                                '&password='+ $scope.install.password +
                                '&prefix='+ $scope.install.prefix +
                                '&folder='+ $scope.install.folder +
                                '&title='+ $scope.install.title +
                                '&adminUsername='+ $scope.install.adminUsername +
                                '&adminPassword='+ $scope.install.adminPassword + 
                                '&email='+ $scope.install.email)
                        .success(function(data){
                            if(data.length===0)
                                $scope.success = true;
                            else
                                $scope.error = $sce.trustAsHtml(data);
                        });
                    } else
                        alert("Passwords don't match");
                };
            });
        </script>
    </head>
</html><?php endif; ?>