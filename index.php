<?php include 'core/app/initialize.php'; ?>
<!doctype html>
<!--
####################################

           Created with:
        __  __   __       __
       /   /  \ (_  |\/| /  \
       \__ \__/ __) |  | \__/

      http://www.cosmocms.org/
            v1.0.0-beta.4

####################################
-->
<html xmlns:ng="http://angularjs.org" id="ng-app" ng-app="main" ng-controller="HTMLCtrl">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if lte IE 9]>
            <script>
                if(window.location.href.indexOf('#!') === -1)
                    window.location.href = window.location.protocol + '//' + window.location.host + '/#!' + window.location.pathname;
            </script>
            <script src="core/js/3rd-party/html5.js"></script>
        <![endif]-->
        <!--[if lte IE 8]>
            <script src="core/js/3rd-party/json2.js"></script>
            <br /><br />Your broswer is incompatible with this site. Please upgrade to a <a href="http://www.browsehappy.com">newer browser.</a>
        <![endif]-->
        <link rel="shortcut icon" href="<?php echo $settings['favicon'] ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
        <meta http-equiv="X-UA-Compatible" content="IE=Edge"/>
        <!-- Meta Tags -->
        <title ng-bind-template="{{title}}"><?php echo $content['title']; ?></title>
        <meta name="description" content="<?php echo $content['description']; ?>">
        <meta property="og:title" content="<?php echo $content['title']; ?>" />
        <meta property="og:description" content="<?php echo $content['description']; ?>" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="<?php echo 'http://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']; ?>" />
<?php if(isset($content['extras']['featured']) && $content['extras']['featured']): ?>
        <?php $requestURI = explode('/', $_SERVER['REQUEST_URI']); ?>
        <meta property="og:image" content="<?php echo 'http://' . $_SERVER['HTTP_HOST'] . $requestURI[0] . '/' . json_decode($content['extras']['featured'])->src; ?>" />
<?php endif; ?>

        <base href="/<?php echo FOLDER; ?>" />

        <script src="<?php echo $minifyScripts; ?>"></script>

        <link rel="stylesheet" type="text/css" href="<?php echo $minifyCSS; ?>">
        <script src="//use.edgefonts.net/quicksand.js"></script>

        <link href="//maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css" rel="stylesheet">

        <?php echo $scripts; ?>
        <?php echo $CSS; ?>

        <script>

            // Setup main module with HTML5 URLs
            angular.module('main', [
                'cosmo',
                'cosmo.admin',
                'pascalprecht.translate',
                'ngRoute',
                'ngAnimate',
                'ui.tree',
                'angularFileUpload',
                'ngResource',
                'ngDialog',
                'ngTouch'<?php echo $angularModules; ?>

            ])

            .config(['$routeProvider', '$locationProvider', '$translateProvider', function($routeProvider, $locationProvider, $translateProvider) {
                // Configure standard URLs
                $routeProvider.
                    when('/admin', { controller: function(ngDialog){ ngDialog.open({ template: 'core/html/login.html', showClose: false, closeByEscape: false, closeByDocument: false }); }, template: '<div></div>' }).
                    when('/reset/:userID/:token', { controller: 'resetModal', template: '<div></div>' }).
                    when('/', { controller: 'urlCtrl', template: '<div ng-include="template" ng-cloak></div>' }).
                    when('/:url', { controller: 'urlCtrl', template: '<div ng-include="template" ng-cloak></div>' });

                // Enable HTML5 urls
                $locationProvider.html5Mode(true).hashPrefix('!');
                
                // Load files from the core/languages folder
                $translateProvider.useStaticFilesLoader({
                    prefix: '/core/languages/',
                    suffix: '.json'
                });
                
                // Set the default language
                $translateProvider.preferredLanguage('<?php echo $settings['language'];?>');
            }])

            // Initialize JS variables
            .run(['Users', '$http', '$templateCache', 'REST', '$rootScope', 'Page', function(Users, $http, $templateCache, REST, $rootScope, Page) {

                Users.username = '<?php echo $username; ?>';<?php if(isset($usersID) && $usersID): ?>

                Users.id = <?php echo $usersID; ?>;<?php endif; ?>

                Users.role = '<?php echo isset($role) ? $role: ''; ?>';<?php if($directives): ?>

                Page.directives = <?php echo json_encode($directives); ?>;<?php endif; ?>

                Page.classes = "<?php echo $classes; ?>";
                Page.themePages = <?php echo json_encode($themeJSON->pages); ?>;
                Page.folder = '<?php echo FOLDER; ?>';<?php if($menus):?>

                Page.menus = <?php echo json_encode($menus); ?>;<?php endif; ?>

                Page.settings = <?php echo json_encode($settings); ?>;
                Page.theme = '<?php echo $theme; ?>';

                // If the user has permissions, show the sidebar.
                if(Users.role === 'admin' || Users.role === 'editor' || Users.role === 'contributor' || Users.id){
                    Users.admin = true;
                    $rootScope.$broadcast('adminLogin');
                }

                // Get the user's role number
                switch(Users.role){
                    case 'admin':
                        Users.roleNum = 1;
                        break;
                    case 'editor':
                        Users.roleNum = 2;
                        break;
                    case 'contributor':
                        Users.roleNum = 3;
                        break;
                    default:
                        Users.roleNum = 4;
                        break;
                }

                // Initialize headers for authorizing API calls
                $http.defaults.headers.common['usersID'] = '<?php echo isset($usersID) ? $usersID : ''; ?>';
                $http.defaults.headers.common['username'] = '<?php echo $username; ?>';
                $http.defaults.headers.common['token'] = '<?php echo isset($token) ? $token : ''; ?>';

                // Cache all template pages
                angular.forEach(Page.themePages, function(page){
                    $templateCache.put('themes/<?php echo $theme; ?>/'+page);
                });

            }]);
        </script>
    </head>
    <body>
        <div ng-if="admin">
            <div ng-include="'core/html/admin-panel.html'"></div>
            <div cs-wysiwyg></div>
        </div>
        <div ng-view class="cosmo-theme"><?php echo $content['body']; ?></div>
        <div cs-notification></div>
    </body>
</html>
