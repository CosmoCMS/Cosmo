/**************************************************
 *              File Controller                   *
 *             Upload/edit files                  *
 **************************************************/

angular.module('cosmo').controller('filesCtrl', ['$scope', '$upload', 'REST', '$rootScope', '$sce', 'Hooks', 'Responsive', function($scope, $upload, REST, $rootScope, $sce, Hooks, Responsive){

    $scope.files = {};
    $scope.files.class = '';
    $scope.files.size = 'responsive';
    $scope.numFiles = 12;

    // Initialize variables
    function filesInit() {
        if($scope.admin.files && $scope.admin.files.gallery){ // Editing an image gallery
            $scope.images = $scope.admin.files.images;
            for(var i=0; i<$scope.images.length; i++)
                $scope.images[i].url = $sce.trustAsResourceUrl($scope.images[i].src);
            $scope.files.gallery = true;
            $scope.editingGallery = true;
        } else {
            $scope.files.gallery = false;
            $scope.editingGallery = false;
        }

        if($scope.admin.files)
            $scope.id = $scope.admin.files.id;

        if($scope.admin.files && $scope.admin.files.data){
            $scope.files.title = $scope.admin.files.data.title;
            $scope.files.class = $scope.admin.files.data.class;
            $scope.files.alt = $scope.admin.files.data.alt;
            $scope.files.href = $scope.admin.files.data.href;
        }
    }
    filesInit();

    $scope.$on('editFiles', function(event, data){
        filesInit();
    });

    // Get files for the media library
    function getFiles(justUploaded){
        // Get all files
        REST.files.query({}, function(data){
            $scope.media = [];
            angular.forEach(data, function(value){
                // Don't do anything to an image that was just uploaded (so modules don't cache images that haven't been uploaded yet)
                if(justUploaded) {
                    if(value.responsive==='yes')
                        var filename = Responsive.resize(value.filename, 'small');
                    else
                        var filename = value.filename;
                } else {
                    if(value.responsive==='yes')
                        var filename = Hooks.imageHookNotify(Responsive.resize(value.filename, 'small'));
                    else
                        var filename = Hooks.imageHookNotify(value.filename);
                }

                $scope.media.push({
                    alt: value.alt,
                    class: value.class,
                    href: value.href,
                    id: value.id,
                    origFilename: value.filename,
                    src: $sce.trustAsResourceUrl(filename),
                    title: value.title,
                    tags: value.tags,
                    type: value.type,
                    responsive: value.responsive
                });
            });

            if(justUploaded){
                $scope.viewFile($scope.media[0]);
                $rootScope.$broadcast('imageSaved', data[0]);
            }
        });
    }
    getFiles();

    // De-selects the file (to go back to the image select view)
    $scope.noSelectedFile = function() {
        $scope.selectedFile = null;
    };

    // Upload files
    $scope.onFileSelect = function($files) {
        // $files: an array of files selected, each file has name, size, and type.
        for (var i = 0; i < $files.length; i++) {
            var $file = $files[i];
            $scope.upload = $upload.upload({
                url: 'api/files', // upload.php script, node.js route, or servlet url
                method: 'POST',
                // headers: {'headerKey': 'headerValue'}, withCredential: true,
                data: {myObj: $scope.myModelObj},
                file: $file,
                //(optional) set 'Content-Desposition' formData name for file
                //fileFormDataName: myFile,
                progress: function(evt) {

                }
            }).progress(function(evt) {
                $scope.progress = parseInt(100.0 * evt.loaded / evt.total) + '% Uploaded';
            }).success(function(data, status, headers, config) {
                // file is uploaded successfully
                getFiles(true);
                $scope.files.upload = false;
                $rootScope.$broadcast('fileUploaded', data);
            });
        }
    };

    $scope.uploadFromUrl = function(){
        REST.files.save({ file: $scope.files.uploadURL }, function(){
            getFiles(true);
            $scope.upload = false;
        });
    };

    // Update the image viewer
    $scope.updateCurrentImage = function(){
        // Check if coming from a gallery
        if(!$scope.media[$scope.currentIndex].src)
           $scope.media[$scope.currentIndex].src = $scope.media[$scope.currentIndex].url;

        $scope.selectedId = $scope.media[$scope.currentIndex].id;
        $scope.selectedFile = $scope.media[$scope.currentIndex].src;
        $scope.origFilename = $scope.media[$scope.currentIndex].origFilename;
        $scope.files.title = $scope.media[$scope.currentIndex].title;
        $scope.files.href = $scope.media[$scope.currentIndex].href;
        $scope.files.alt = $scope.media[$scope.currentIndex].alt;
        $scope.files.class = $scope.media[$scope.currentIndex].class;
        $scope.files.tags = $scope.media[$scope.currentIndex].tags;
        $scope.files.type = $scope.media[$scope.currentIndex].type;
        $scope.files.responsive = $scope.media[$scope.currentIndex].responsive;
    };

    // View this media info
    $scope.viewFile = function(file, index){
        $scope.selectedId = file.id;
        $scope.selectedFile = file.src;
        $scope.origFilename = file.origFilename;
        $scope.files.type = file.type;
        $scope.files.title = file.title;
        $scope.files.class = file.class;
        $scope.files.alt = file.alt;
        $scope.files.href = file.href;
        $scope.files.responsive = file.responsive;
        $scope.currentIndex = index;
    };

    // Go to the previous image/media item
    $scope.prev = function(){
        $scope.currentIndex = $scope.currentIndex-1;
        $scope.updateCurrentImage();
    };

    // Make sure the next image exists
    $scope.nextExists = function(){
        if(angular.isNumber($scope.currentIndex) && $scope.media[$scope.currentIndex+1])
            return true;
        else
            return false;
    };

    // Go to the next image/media item
    $scope.next = function(){
        $scope.currentIndex++;
        $scope.updateCurrentImage();
    };

    // Save title/tags to the file
    $scope.save = function(){

        // Delete old tags
        REST.filesTags.delete({ fileID: $scope.selectedId });

        // Save file tags
        angular.forEach($scope.files.tags, function(tag){
            REST.filesTags.save({ fileID: $scope.selectedId, tag: tag });
        });

        // Update gallery if applicable
        angular.forEach($scope.images, function(image, key){
            if(parseInt(image.id) === parseInt($scope.selectedId)){
                $scope.images[key].title = $scope.files.title;
                $scope.images[key].href = $scope.files.href;
                $scope.images[key].alt = $scope.files.alt;
                $scope.images[key].class = $scope.files.class;
                $scope.images[key].tags = $scope.files.tags;
            }
        });
    };

    // Delete file
    $scope.deleteFile = function(){
        REST.files.delete({
            fileID: $scope.selectedId
        }, function(data){
            $scope.selectedFile = '';
            getFiles();
        });
    };

    // Save image gallery
    $scope.saveGallery = function(){
        $rootScope.$broadcast('choseGalleryFile', { id: $scope.id, data: $scope.images });
        $scope.admin.showAdminPanel = false;
    };

    // Select media
    $scope.selectFile = function(){
        if($scope.editingGallery){
            $scope.files.gallery = true;
            $scope.images.push({
                id: $scope.selectedId,
                autoload: $scope.files.autoload,
                autoplay: $scope.files.autoplay,
                loop: $scope.files.loop,
                controls: $scope.files.controls,
                title: $scope.files.title,
                alt: $scope.files.alt,
                src: $scope.origFilename,
                href: $scope.files.href,
                class: $scope.files.class,
                tags: $scope.files.tags,
                type: $scope.files.type,
                size: $scope.files.size,
                responsive: $scope.files.responsive,
                url: $scope.origFilename
            });
        } else {
            if($rootScope.tempSidebarPic){
                $rootScope.tempSidebarPic.src = $scope.origFilename;
                $scope.admin.sidebar = $rootScope.tempSidebarPic.sidebar;
            } else {
                $rootScope.$broadcast('choseFile', {
                    id: $scope.id,
                    title: $scope.files.title,
                    alt: $scope.files.alt,
                    src: $scope.origFilename,
                    href: $scope.files.href,
                    class: $scope.files.class,
                    size: $scope.files.size,
                    responsive: $scope.files.responsive
                });
                $scope.admin.showAdminPanel = false;
            }
        }
    };

}]);
