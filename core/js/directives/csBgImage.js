/**************************************************
 *             BGImage Directive                  *
 *             Background images                  *
 **************************************************/

angular.module('cosmo').directive('csBgImage', ['Page', '$rootScope', 'Users', 'Responsive', 'Hooks', function(Page, $rootScope, Users, Responsive, Hooks) {
    return {
        link: function(scope, elm, attrs, ctrl) {

            var imageURL;

            function updateBGImage(){
                if(Page.extras[attrs.csBgImage]){
                    Page.extras[attrs.csBgImage] = angular.fromJson(Page.extras[attrs.csBgImage]);
                    if(Page.extras[attrs.csBgImage].responsive === 'yes')
                        var imageURL = Hooks.imageHookNotify(Responsive.resize(Page.extras[attrs.csBgImage].src, Page.extras[attrs.csBgImage].size));
                    else
                        var imageURL = Hooks.imageHookNotify(Page.extras[attrs.csBgImage].src);
                    elm.css('background-image', 'url('+ imageURL +')');
                } else if(Users.admin)
                    elm.css('background-image', 'url(core/img/image.svg)');
            }
            updateBGImage();

            scope.$on('contentGet', function(){
                updateBGImage();
            });

            // Check if user is an admin
            if(Users.admin) {
                // Double click image to edit
                elm.on('dblclick', function(){
                    $rootScope.$broadcast('editFiles', angular.toJson({
                            id: attrs.csBgImage,
                            data: imageURL
                        })
                    );
                });

                // Update page when another image is chosen
                scope.$on('choseFile', function(event, data){
                    if(data.id === attrs.csBgImage){
                        Page.extras[attrs.csBgImage] = data;
                        elm.css('background-image', 'url('+ data.src +')');
                    }
                });
            }
        }
    };
}]);
