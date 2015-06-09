/**************************************************
 *              Audio Directive                   *
 *                HTML5 Audio                     *
 **************************************************/

angular.module('cosmo').directive('csAudio', ['Page', '$routeParams', '$rootScope', 'Users', '$sce', function(Page, $routeParams, $rootScope, Users, $sce) {
    return {
        template: '<audio ng-dblclick="clicked()"><source ng-repeat="file in audioFiles" ng-src="{{file.src}}"></audio>',
        replace: true,
        link: function(scope, elm, attrs) {

            if(Page.extras[attrs.csAudio])
                scope.audioFiles = angular.fromJson(Page.extras[attrs.csAudio]);
            else if(Users.admin)
                scope.audioFiles = [{ src: 'core/img/image.svg', type: 'audio' }];

            elm.css('min-height', '50px'); // Only way to make this clickable in Chrome?

            // Check if user is an admin
            if(Users.admin) {
                scope.clicked = function(){
                    $rootScope.$broadcast('editFiles', angular.toJson({
                            id: attrs.csAudio,
                            data: scope.audioFiles
                        })
                    );
                };

                // Save edits/selection of the movie
                scope.$on('choseGalleryFile', function(event, data){
                    if(data.id === attrs.csMovie){
                        scope.audioFiles = data.data;
                        Page.extras[attrs.csMovie] = scope.audioFiles;
                    }
                });
            }
        }
    };
}]);
