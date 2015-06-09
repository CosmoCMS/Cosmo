/**************************************************
 *              Image Directive                   *
 **************************************************/

angular.module('cosmo').directive('csImage', ['Page', '$rootScope', 'Users', 'REST', '$compile', '$http', 'Responsive', 'Hooks', '$timeout', function(Page, $rootScope, Users, REST, $compile, $http, Responsive, Hooks, $timeout){
    return {
        scope: {},
        template: '<img ng-src="{{src}}" alt="{{image.alt}}" title="{{image.title}}" size="{{image.size}}" />',
        replace: true,
        compile: function(scope, elm, attrs) {
            return {
                pre: function(scope, elm, attrs){
                    attrs.ngSrc = '{{src}}';
                    attrs.class = '{{image.class}}';
                    attrs.alt = '{{image.alt}}';
                    attrs.title = '{{image.title}}';
                    attrs.size = '{{image.size}}';
                },
                post: function(scope, elm, attrs){

                    scope.image = {};

                    // Initialize the image data
                    if(Page.extras[attrs.csImage]){
                        Page.extras[attrs.csImage] = angular.fromJson(Page.extras[attrs.csImage]);
                        scope.image.class = Page.extras[attrs.csImage].class;
                        elm.attr('class', Page.extras[attrs.csImage].class);
                        scope.image.alt = Page.extras[attrs.csImage].alt;
                        scope.image.title = Page.extras[attrs.csImage].title;
                        scope.image.size = Page.extras[attrs.csImage].size;

                        // Get responsive URL for the image
                        if(Page.extras[attrs.csImage].responsive === 'yes')
                            scope.src = Hooks.imageHookNotify(Responsive.resize(Page.extras[attrs.csImage].src, Page.extras[attrs.csImage].size));
                        else
                            scope.src = Hooks.imageHookNotify(Page.extras[attrs.csImage].src);

                        // Check if this image should be linked
                        if(Page.extras[attrs.csImage].href)
                            elm.wrap('<a href="'+ Page.extras[attrs.csImage].href +'"></a>');

                    } else if(Users.admin)
                        scope.src = 'core/img/image.svg';

                    // Check if user is an admin
                    if(Users.admin) {
                        // Open image editing modal
                        elm.on('click', function(){
                            $rootScope.$broadcast('editFiles', angular.toJson({
                                    id: attrs.csImage,
                                    data: scope.image
                                })
                            );

                            // Don't show the wysiwyg editor when someone clicks an image
                            $timeout(function(){
                                $rootScope.$broadcast('hideWYSIWYG');
                            });
                        });

                        // Save edits to the image
                        scope.$on('choseFile', function(event, data){
                            if(data.id === attrs.csImage){
                                scope.image = data;
                                Page.extras[attrs.csImage] = data;
                                elm.addClass(data.class);

                                // Get responsive URL for the image
                                if(data.responsive === 'yes')
                                    scope.src = Responsive.resize(Page.extras[attrs.csImage].src, Page.extras[attrs.csImage].size);
                                else
                                    scope.src = Page.extras[attrs.csImage].src;
                            }
                        });
                    }
                }
            };
        }
    };
}]);
