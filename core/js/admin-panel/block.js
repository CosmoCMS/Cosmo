/**************************************************
 *             Block Controller                   *
 *       Manage the sidebar block editor          *
 **************************************************/

angular.module('cosmo').controller('blockCtrl', ['$scope', 'REST', 'Page', '$rootScope', '$translate', function($scope, REST, Page, $rootScope, $translate){

    $scope.block = {};
    $scope.block.panel = 'manage';
    $scope.types = [];
    $scope.block.selectedTypes = {};

    // Get all available blocks
    REST.blocks.query({}, function(data){
        $scope.blocks = data;
    });

    // Get the page types availabl
    $scope.types = Page.themePages;

    $scope.$on('wysiwygEdit', function(event, data){
        $scope.block.html = data.html;
    });

    // Select a block
    $scope.selectBlock = function(block){
        $scope.block.id = block.id;
        $scope.block.name = block.name;
        $scope.block.panel = 'edit';
        $scope.block.html = block.block;
        $scope.block.area = block.area;

        if(block.priority)
            $scope.block.priority = block.priority;
        else
            $scope.block.priority = 0;

        Page.extras.none = $scope.block.html;
        $rootScope.$broadcast('contentGet');

        // Get the block requirements
        REST.blocksRequirements.query({ blockID: $scope.block.id }, blockRequirementsPromise);
    };

    // Update block requirements
    function blockRequirementsPromise(data){
        var blockURLs = '';
        angular.forEach(data, function(data2){
            if(data2.type === 'visible' || data2.type === 'invisible'){
                $scope.block.visibility = data2.type;
                blockURLs += data2.requirement + "\n";
            } else {
                if(data2.type)
                    $scope.block.selectedTypes[data2.requirement] = true;
            }
        });
        $scope.block.urls = blockURLs;
    }

    // Add a new block
    $scope.newBlock = function(){
        REST.blocks.save({ name: $scope.block.newName }, newBlockPromise);
    };

    // Update info from the new block
    function newBlockPromise(data){
        if($scope.blocks)
            $scope.blocks.push({ id: data.data, name: $scope.block.newName });
        else
            $scope.blocks = [{ id: data.data, name: $scope.block.newName }];

        $scope.block.newName = '';
        $translate('blocks_added').then(function(translatedText){
            $rootScope.$broadcast('notify', {message: translatedText});
        });
    }

    // Delete block
    $scope.deleteBlock = function(){
        REST.blocks.delete({ blockID: $scope.block.id }, deleteBlockPromise);
    };

    // Update block after being deleted
    function deleteBlockPromise(data){
        if(data){
            for(var i=0; i< $scope.blocks.length; i++){
                if($scope.blocks[i]['id'] === $scope.block.id)
                    $scope.blocks.splice(i,1);
            }
            $scope.block.name = '';
            $translate('blocks_deleted').then(function(translatedText){
                $rootScope.$broadcast('notify', {message: translatedText});
            });
        }
    }

    // Update block section/priority from the overview section
    $scope.updateBlock = function(block){
        REST.blocks.update({
            blockID: block.id,
            name: block.name,
            block: block.block,
            area: block.area,
            priority: parseInt(block.priority)
        }, function(data){
            $translate('blocks_updated').then(function(translatedText){
                $rootScope.$broadcast('notify', {message: translatedText});
            });
        });
    };

    // Save the addition/edits to the block
    $scope.saveBlock = function(){
        // Save block to database
        REST.blocks.update({
            blockID: $scope.block.id,
            name: $scope.block.name,
            block: $scope.block.html,
            area: $scope.block.area,
            priority: $scope.block.priority
        }, saveBlockPromise);
    };

    // Update page after saving a block
    function saveBlockPromise(data){

        // Update block name in CMS
        for(var i=0; i< $scope.blocks.length; i++){
            if($scope.blocks[i]['id'] === $scope.block.id)
                $scope.blocks[i]['name'] = $scope.block.name;
        }

        // Delete old visibility requirements
        REST.blocksRequirements.delete({ blockID: $scope.block.id }, blocksRequirementsDeletePromise);

        // Notify the user of the updated block
        $translate('blocks_updated').then(function(translatedText){
            $rootScope.$broadcast('notify', {message: translatedText});
        });
    };

    // Update visibility requirements
    function blocksRequirementsDeletePromise(){
        // Save block visibility requirements
        if($scope.block.visibility){
            var urls = $scope.block.urls.split("\n");
            for(var i=0; i<urls.length; i++){
                REST.blocksRequirements.save({
                    blockID: $scope.block.id,
                    type: $scope.block.visibility,
                    requirement: urls[i]
                });
            }
        }

        // Save block page type requirements
        angular.forEach($scope.block.selectedTypes, function(value, key){
            if($scope.block.selectedTypes[key]){
                REST.blocksRequirements.save({
                    blockID: $scope.block.id,
                    type: 'type',
                    requirement: key
                }, fetchUpdatedBlocks);
            }
        });
        fetchUpdatedBlocks();
    }

    // Get new updated blocks
    function fetchUpdatedBlocks(){
        REST.blocks.query({ type: Page.type, url: Page.url }, function(data){
            Page.blocks = data;
            $rootScope.$broadcast('blocksGet', data);
        });
    }
}]);
