<? include 'core/app/initialize.php'; ?>
<!doctype html>
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
        
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
        <meta http-equiv="X-UA-Compatible" content="IE=Edge"/>
        <!-- Meta Tags -->
        <title ng-bind-template="{{title}}"><?php echo $content['title']; ?></title>
        <meta name="description" content="<?php echo $content['description']; ?>">
        <meta property="og:title" content="<?php echo $content['title']; ?>" />
        <meta property="og:description" content="<?php echo $content['description']; ?>" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="<?php echo 'http://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']; ?>" />
<?php if($content['extras']['featured']): ?>
        <meta property="og:image" content="<?php echo 'http://' . $_SERVER['HTTP_HOST'] . explode('/', $_SERVER['REQUEST_URI'])[0] . json_decode($content['extras']['featured'])->src; ?>" />
<?php endif; ?>
        
        <base href="/" />
        
        <script src="modules/KHP/js/jquery.min.js"></script>
        
        <script src="<?php echo $minifyScripts; ?>"></script>
        
        <link rel="stylesheet" type="text/css" href="<?php echo $minifyCSS; ?>">
        
        <?php echo $scripts; ?>
        <?php echo $CSS; ?>
        
        <script>
            
            // Setup main module with HTML5 URLs for SEO
            angular.module('main', [
                'cosmo',
                'ngRoute',
                'ngAnimate',
                'ui.tree',
                'angularFileUpload',
                'angular-growl',
                'ngQuickDate',
                'ngResource',
                'ngDialog',
                'ngTouch'<?php echo $angularModules; ?>
                
            ])
            
            .config(['$routeProvider', '$locationProvider', 'growlProvider', function($routeProvider, $locationProvider, growlProvider) {
                // Configure standard URLs
                $routeProvider.
                    when('/admin', { controller: function(ngDialog){ ngDialog.open({ template: 'core/html/login.html' }); }, template: '<div></div>' }).
                    when('/reset/:userID/:token', { controller: 'resetModal', template: '<div></div>' }).
                    when('/:url', { controller: 'urlCtrl', template: '<div ng-include="template"></div>' });
                    
                // Enable HTML5 urls
                $locationProvider.html5Mode(true).hashPrefix('!');

                // Timeout messages after 5 seconds
                growlProvider.globalTimeToLive(5000);
                // growlProvider.globalEnableHtml(true);
            }])
            
            // Initialize JS variables
            .run(['Users', '$http', '$templateCache', 'REST', '$rootScope', 'growl', 'Page', function(Users, $http, $templateCache, REST, $rootScope, growl, Page) {
                
                growl.addSuccessMessage('Message', { ttl: 999, classes: 'cosmo-default' });
                
                Users.username = '<?php echo $username; ?>';<?php if($usersID): ?>
                
                Users.id = <?php echo $usersID; ?>;<?php endif; ?><?php if($isUserAdmin): ?>
                
                Users.admin = true;    
                <?php endif; ?>
                
                // Get the user's role
                if(Users.id){
                    REST.usersRoles.get({userID: Users.id}, function(data){

                        Users.roles = data;

                        // Check if the user is an administrator
                        angular.forEach(data, function(role){
                            if(role.toLowerCase() === 'admin')
                                $rootScope.$broadcast('adminLogin');
                        });
                    });
                }
                
                // Initialize headers for authorizing API calls
                $http.defaults.headers.common['username'] = '<?php echo $username; ?>';
                $http.defaults.headers.common['token'] = '<?php echo $token; ?>';
                
                // Load template
                REST.settings.get({}, function(data){
                    Page.settings = data;
                    Page.theme = data.theme;
                    $rootScope.$broadcast('settingsGet', data);
                });
                
                // Load menus
                REST.menus.query({}, function(data){
                    Page.menus = data;
                    $rootScope.$broadcast('menusGet', data);
                });
                
                // Cache all template pages
                REST.themes.query({themeID: '<?php echo $theme; ?>'}, function(data){
                    angular.forEach(data, function(page){
                        if(page.type)
                            $templateCache.put('themes/<?php echo $theme; ?>/'+page.type);
                    });
                });
                
            }]);
            
        </script>
    </head>
    <body>
        <div ng-if="admin">
            <div adminpanel></div>
            <div wysiwyg></div>
        </div>
        
        <div ng-include="'themes/KHP/partials/header.html'"></div>
        <div ng-view class="at-view-fade-in at-view-fade-out"><?php echo $content['body']; ?></div>

        <div growl></div>
    </body>
</html>