/**************************************************
 *               Link Controller                  *
 **************************************************/

angular.module('cosmo').controller('linkCtrl', ['$scope', '$rootScope', function($scope, $rootScope){
    $scope.save = function(){
        $rootScope.$broadcast('editedLink', {text: $scope.link.text, url: $scope.link.url});
    };
}]);
