/**************************************************
 *            Comments Controller                 *
 **************************************************/

angular.module('cosmo').controller('commentsCtrl', ['$scope', 'REST', 'Page', 'Users', '$rootScope', function($scope, REST, Page, Users, $rootScope){

    // Initialize variables
    $scope.comment = {};
    $scope.comments = Page.comments;

    // Get the path of the last comment
    if($scope.comments && $scope.comments[0] && $scope.comments[0].path)
        $scope.comment.path = [$scope.comments[$scope.comments.length-1].path[0]+1];
    else
        $scope.comment.path = [1];

    // See if the user is logged in
    if(!Users.username)
        $scope.guest = true;

    // Watch for comments
    $scope.$on('commentsGet', function(event, data){
        $scope.comments = data.comments;
        // Get the path of the last comment
        if($scope.comments && $scope.comments[0] && $scope.comments[0].path)
            $scope.comment.path = [$scope.comments[$scope.comments.length-1].path[0]+1];
        else
            $scope.comment.path = [1];
    });

    // Check the level of the reply.
    $scope.replyLevel = function(path){
        if(path)
            return path.length;
        else
            return 0;
    };

    // Set the path for someone to reply to another comment
    $scope.reply = function(index, path){
        var tempPath = angular.copy(path);
        tempPath.push(1);
        index++; // Check against the next comment in the array
        while($scope.comments[index] && angular.equals(tempPath, $scope.comments[index].path)){
            tempPath[tempPath.length-1]++; // Increment the last path number
            index++; // Go to the next comment in the array
        }
        $scope.comment.path = tempPath;
    };

    // Post a new comment
    $scope.submit = function(){
        REST.comments.save({
            content_id: Page.id,
            path: angular.toJson($scope.comment.path),
            name: Users.username,
            email: Users.email,
            comment: $scope.comment.message
        }, function(data){
            $scope.comments.push({path: $scope.comment.path, name: Users.username, email: Users.email, comment: $scope.comment.message});
            $rootScope.$broadcast('notify', { message: 'Comment Added' });
        }, function(){
            $rootScope.$broadcast('notify', { message: 'There was an error submitting your comment' });
        });
    };
}]);
