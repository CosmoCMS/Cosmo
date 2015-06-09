/**************************************************
 *              Block Directive                   *
 **************************************************/

angular.module('cosmo').directive('csBlock', ['Page', '$compile', '$timeout', function(Page, $compile, $timeout) {
    return {
        link: function(scope, elm, attrs, ctrl) {

            var updateBlocks = function() {
                // Match the block(s) to the right location
                if(Page.blocks) {
                    var blockHTML = '';
                    angular.forEach(Page.blocks, function(data){
                        if(data.area === attrs.csBlock)
                            blockHTML += data.block;
                    });

                    elm.html(blockHTML);
                    $timeout(function(){
                        $compile(elm.contents())(scope);
                    });
                }
            };
            updateBlocks();

            scope.$on('blocksGet', function(){
                updateBlocks();
            });
        }
    };
}]);
