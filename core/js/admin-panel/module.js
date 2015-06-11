/**************************************************
 *              Module Controller                 *
 *      Manage the admin sidebar modules          *
 **************************************************/

angular.module('cosmo').controller('moduleCtrl', ['$scope', 'REST', '$rootScope', '$http', function($scope, REST, $rootScope, $http){

    // Get modules
    REST.modules.query({}, function(data){
        $scope.modules = data;
    });

    // Install Module
    $scope.install = function(module, index){
        $scope.currentIndex = index;
        REST.modules.save({ module: module }, installModulePromise);
    };

    // Update the page after installing a new module
    function installModulePromise(data){
        $scope.modules[$scope.currentIndex]['status'] = 'active';

        // Check for an installation file and run it
        if($scope.modules[$scope.currentIndex]['install'])
            $http.get('modules/'+ $scope.modules[$scope.currentIndex]['folder'] +'/'+ $scope.modules[$scope.currentIndex]['install']);

        // Success Message
        $translate('module_installed').then(function(translatedText){
            $rootScope.$broadcast('notify', { message: translatedText });
        });
    }

    // Uninstall Module
    $scope.uninstall = function(moduleID, index){
        $scope.currentIndex = index;
        REST.modules.delete({ moduleID: moduleID }, uninstallModulePromise);
    };

    // Update the page after uninstalling a module
    function uninstallModulePromise(data){
        // Check for an uninstallation file and run it
        if($scope.modules[$scope.currentIndex]['uninstall'])
            $http.get('modules/'+ $scope.modules[$scope.currentIndex]['folder'] +'/'+ $scope.modules[$scope.currentIndex]['uninstall']);

        // Remove module from sidebar
        $scope.modules[$scope.currentIndex] = null;

        // Success Message
        $translate('module_uninstalled').then(function(translatedText){
            $rootScope.$broadcast('notify', {message: translatedText});
        });
    }

    // Activate Module
    $scope.activate = function(moduleID, index){
        $scope.currentIndex = index;
        REST.modules.update({ moduleID: moduleID, status: 'active' }, activateModulePromise);
    };

    // Update the page after activating a module
    function activateModulePromise(data){
        $scope.modules[$scope.currentIndex]['status'] = 'active';

        // Success Message
        $translate('module_activated').then(function(translatedText){
            $rootScope.$broadcast('notify', {message: translatedText});
        });
    }

    // Deactivate Module
    $scope.deactivate = function(moduleID, index){
        $scope.currentIndex = index;
        REST.modules.update({ moduleID: moduleID, status: 'inactive' }, deactivateModulePromise);
    };

    // Update the page after deactivating a module
    function deactivateModulePromise(data){
        $scope.modules[$scope.currentIndex]['status'] = 'inactive';

        // Success Message
        $translate('module_deactivated').then(function(translatedText){
            $rootScope.$broadcast('notify', {message: translatedText});
        });
    }

    // Go to a module's settings
    $scope.goToSettings = function(folder, file){
        $scope.settingsFile = 'modules/'+ folder +'/'+ file;
    };

}]);
