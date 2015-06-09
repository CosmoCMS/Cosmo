/**************************************************
 *          Content List Controller               *
 *             Search content                     *
 **************************************************/

angular.module('cosmo').controller('contentListCtrl', ['$scope', 'REST', 'Hooks', 'Responsive', function($scope, REST, Hooks, Responsive){

    $scope.search = {};
    $scope.exclude = {};
    $scope.exclude.tags = '!exclude';
    $scope.content = {};
    $scope.content.onlySearch = 'all';

    // Search
    $scope.searchBar = function(){
        $scope.search = {};
        switch($scope.content.onlySearch){
            case 'type': // Search only the page type
                $scope.search.type = $scope.content.input;
                break;
            case 'author': // Search only the author
                $scope.search.author = $scope.content.input;
                break;
            case 'tags': // Search only the tags
                $scope.search.tags = $scope.content.input;
                break;

            default: // Search anywhere
                $scope.search = $scope.content.input;
                break;
        }
    };

    // Fetch content
    REST.content.query({}, fetchContentPromise);

    // Update the content after it's called
    function fetchContentPromise(data){
        angular.forEach(data, function(data2){
            data2.featured = Hooks.imageHookNotify(Responsive.resize(data2.featured, 'small'));
        });
        $scope.pages = data;
    }
}]);
