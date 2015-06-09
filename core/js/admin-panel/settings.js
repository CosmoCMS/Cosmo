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

    // Default if no custom images were set
    if(!$scope.settings.logo)
        $scope.settings.logo = 'core/img/image.svg';
    if(!$scope.settings.favicon)
        $scope.settings.favicon = 'core/img/image.svg';

    // Add a profile photo
    $scope.uploadPhoto = function(type){
        $rootScope.$broadcast('editFiles', angular.toJson({
                id: type,
                data: {
                    src: $scope.settings.logo
                }
            })
        );
    };

    // Watch for edits to the logo or favicon
    $scope.$on('choseFile', function(event, data){
        if(data.id === 'logo')
            $scope.settings.logo = data.src;
        else if(data.id === 'favicon')
            $scope.settings.favicon = data.src;
    });

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
            $rootScope.$broadcast('notify', {message: 'Settings updated'});
        });
    };

}]);
