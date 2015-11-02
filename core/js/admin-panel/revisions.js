/**************************************************
 *            Revisions Controller                *
 *         Check the revision history             *
 **************************************************/

angular.module('cosmo').controller('revisionsCtrl', ['$scope', 'REST', 'Page', '$rootScope', '$translate', function($scope, REST, Page, $rootScope, $translate){

    // Get all revisions for this url
    REST.contentRevisions.query({ contentID: Page.id }, function(data){
        $scope.revisions = data;
    });

    // Get the file clicked and the previous version
    $scope.getRevision = function(index){
        var current = $scope.revisions[index];
        var previous = $scope.revisions[index+1];

        Page.title = $scope.compare(previous.title, current.title).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        Page.description = $scope.compare(previous.description, current.description).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        Page.body = $scope.compare(previous.body, current.body).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        Page.header = $scope.compare(previous.header, current.header).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        Page.subheader = $scope.compare(previous.subheader, current.subheader).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

        $rootScope.$broadcast('contentGet');
    };

    // Set the source file
    $scope.compare = function(previous, current){
        if(!current)
            current = '';
        if(!previous)
            previous = '';

        var dmp = new diff_match_patch();
        var d = dmp.diff_main(previous, current);
        dmp.diff_cleanupSemantic(d);
        return dmp.diff_prettyHtml(d);
    };

    // Revert to previous edition
    $scope.revert = function(index){
        REST.contentRevisions.save({ contentID: Page.id, revisionID: $scope.revisions[index].id }, function(){
            $translate('revisions_revised').then(function(translatedText){
                $rootScope.$broadcast('notify', {message: translatedText});
            });
        });
    };

}]);
