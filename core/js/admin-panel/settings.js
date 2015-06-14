/**************************************************
 *             Settings Controller                *
 *        Manage the settings of the site         *
 **************************************************/

angular.module('cosmo').controller('settingsCtrl', ['$scope', 'REST', '$rootScope', 'Page', '$translate', function($scope, REST, $rootScope, Page, $translate){

    $scope.settings = {};
    $scope.settings.siteName = Page.settings.site_name;
    $scope.settings.logo = Page.settings.logo;
    $scope.settings.favicon = Page.settings.favicon;
    $scope.settings.slogan = Page.settings.slogan;
    $scope.settings.email = Page.settings.email;
    $scope.settings.language = Page.settings.language;
    $scope.settings.maintenanceURL = Page.settings.maintenance_url;
    if(Page.settings.maintenance_mode)
        $scope.settings.maintenanceMode = true;

    // Check if the file was just selected from the media panel
    if($rootScope.tempSidebarPic && $rootScope.tempSidebarPic.id === 'logo')
        $scope.settings.logo = $rootScope.tempSidebarPic.src;
    if($rootScope.tempSidebarPic && $rootScope.tempSidebarPic.id === 'favicon')
        $scope.settings.favicon = $rootScope.tempSidebarPic.src;

    $rootScope.tempSidebarPic = null;

    // Default if no custom images were set
    if(!$scope.settings.logo)
        $scope.settings.logo = 'core/img/image.svg';
    if(!$scope.settings.favicon)
        $scope.settings.favicon = 'core/img/image.svg';

    // Add a profile photo
    $scope.uploadPhoto = function(type){
        // Save the data before switching
        $scope.changeSettings();
        $rootScope.tempSidebarPic = {
            id: type,
            src: $scope.settings.logo,
            sidebar: 'core/html/settings.html'
        }
        $rootScope.$broadcast('editFiles', angular.toJson($rootScope.tempSidebarPic));
    };

    $scope.changeLanguage = function(key){
        $translate.use(key);
    };

    // Save settings
    $scope.changeSettings = function(){
        REST.settings.update({
            siteName: $scope.settings.siteName,
            slogan: $scope.settings.slogan,
            logo: $scope.settings.logo,
            favicon: $scope.settings.favicon,
            email: $scope.settings.email,
            language: $scope.settings.language,
            maintenanceURL: $scope.settings.maintenanceURL,
            maintenanceMode: $scope.settings.maintenanceMode
        }, function(data){
            Page.settings.site_name = $scope.settings.siteName;
            Page.settings.logo = $scope.settings.logo;
            Page.settings.favicon = $scope.settings.favicon;
            Page.settings.slogan = $scope.settings.slogan;
            Page.settings.email = $scope.settings.email;
            Page.settings.language = $scope.settings.language;
            Page.settings.maintenance_url = $scope.settings.maintenanceURL;
            $translate('settings_updated').then(function(translatedText){
                $rootScope.$broadcast('notify', {message: translatedText});
            });
        });
    };

}]);
