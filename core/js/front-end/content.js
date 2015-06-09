/**************************************************
 *             Content Controller                 *
 *          Get all posts and pages               *
 **************************************************/

angular.module('cosmo').controller('contentCtrl', ['$scope', 'REST', function($scope, REST){
    // Get all pages
    REST.content.query({}, function(data){
        $scope.posts = data;
    });
}]);
