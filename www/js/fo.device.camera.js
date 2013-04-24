
var fo = fo || {};

fo.loadImageFile = function () {

    if (window.FileReader) {
        var oPreviewImg = null, oFReader = new window.FileReader(),
            rFilter = /^(?:image\/bmp|image\/cis\-cod|image\/gif|image\/ief|image\/jpeg|image\/jpeg|image\/jpeg|image\/pipeg|image\/png|image\/svg\+xml|image\/tiff|image\/x\-cmu\-raster|image\/x\-cmx|image\/x\-icon|image\/x\-portable\-anymap|image\/x\-portable\-bitmap|image\/x\-portable\-graymap|image\/x\-portable\-pixmap|image\/x\-rgb|image\/x\-xbitmap|image\/x\-xpixmap|image\/x\-xwindowdump)$/i;

        oFReader.onload = function (oFREvent) {
            if (!oPreviewImg) {
                var newPreview = document.getElementById("imagePreview");
                oPreviewImg = new Image();
                oPreviewImg.id = "pict";
                oPreviewImg.style.width = (newPreview.offsetWidth).toString() + "px";
                oPreviewImg.style.height = (newPreview.offsetHeight).toString() + "px";
                newPreview.appendChild(oPreviewImg);

                var oDelete = document.createElement('span');
                oDelete.className = "deleteImage";
                var x = document.createTextNode("X");
                oDelete.appendChild(x);
                newPreview.appendChild(oDelete);

            }
            oPreviewImg.src = oFREvent.target.result;
        };

        return function () {
            var aFiles = document.getElementById("imageInput").files;
            if (aFiles.length === 0) { return; }
            if (!rFilter.test(aFiles[0].type)) { alert("You must select a valid image file!"); return; }
            oFReader.readAsDataURL(aFiles[0]);
        };
    }
};

fo.cameraSuccess = function (imageData) {
    var newPreview = document.getElementById("imagePreview");
    var oPreviewImg = new Image();
    oPreviewImg.id = "pict";
    oPreviewImg.src = "data:image/jpeg;base64," + imageData;
    console.log(oPreviewImg);
    newPreview.appendChild(oPreviewImg);
}

fo.cameraError = function (message) {
    alert('Failed because: ' + message);

}

$(document).on("appInit", function () {

    $('#imageCapture').on('reset.imageCapture', function (e) {
        $(this).find('.deleteImage').trigger('click');
        e.stopPropagation();
        e.preventDefault();
    });

    $('#imagePreview').on('click', '.deleteImage', function (e) {
        $(this).parent().contents().fadeOut().end().empty();
        e.preventDefault();
        e.stopPropagation();
    });

    $("#imagePreview").on("click", function (e) {
        if (navigator.camera) {
            var getImage = navigator.camera.getPicture(fo.cameraSuccess, fo.cameraError, { quality: 50 });
            getImage();
            e.preventDefault();
            e.stopPropagation();
        }
    });

    $("#imageInput").on("change", function (e) {
        var getImage = new fo.loadImageFile();
        getImage();
        e.preventDefault();
        e.stopPropagation();
    });
});