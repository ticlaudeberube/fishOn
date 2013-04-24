
var fo = fo || {};

/* live spot object */

fo = {
    spot: {
        uuid: "",
        date: "",
        lat: "",
        lng: "",
        pict: "",
        location: "",
        comment: "No comment",
        user: "",
        isCloud: false
    },


    /* data storage*/

    client: new WindowsAzure.MobileServiceClient(
        "https://fishingspots.azure-mobile.net/",
        "bmRflNRzkRRxGkHhBKtBUcKOPEnEtp93"
    ),

    schema: {
        spots: [{
            name: 'spot',
            keyPath: "uuid"
        }]
    },

    /**
     * Create and initialize the database. Depending on platform, this will
     * create IndexedDB or WebSql or even localStorage storage mechanism.
     * @type {ydn.db.Storage}
     */

    db: new ydn.db.Storage('fishOn', this.schema),

    /*
    db.onReady = function (event) {
        var e = event.getError();
        if (e) {
            console.severe('Fail to connect to the database');
            throw e;
        } else {
            console.log('database ' + db.getName() + ' version ' + event.getVersion() +
              ' [' + db.getType() + '] ready.');
        }
    };
    */
    addLocalSpot: function () {
        var data = this.spot;

        this.db.put('spot', data, data.uuid)
        .fail(function (e) {
            throw e;
        })
        .then(function () {
            fo.spot = {}; // reset global spot object values
            $('#spotForm').find('[type=reset]').trigger('click');
            $('ul.collapsible > li').eq('2').find('.header').trigger('click');

            fo.getLocalSpots();
        });
    },

    deleteSpot: function (uuid) {
        this.db.remove('spot', uuid).fail(function (e) {
            throw e;
        })
        .done(function () {
            fo.getLocalSpots();
        });
    },

    getLocalSpots: function () {
        var df = fo.db.values('spot');

        df.done(function (items) {
            fo.updateMySpots(items);
        });

        df.fail(function (e) {
            throw e;
        });
    },

    updateMySpots: function (spots) {
        var spotList = "";
        var list = $('#mySpotsList').empty();

        if (spots.length) {
            spotList = $.map(spots, function (spot) {

                return $('<li>')
                   .attr('data-uuid', spot.uuid)
                   .attr('data-isCloud', spot.isCloud)
                   .append('<span class="tmb"></span>')
                   .append('<p>' + spot.location + '<br>' + spot.comment)
                   .append('<a class="edit" href="#edit" data-rel="dialog" data-role="button" title="Edit local spot">E</span> ')
                   .append('<a class="delete" title="Delete local Spot">D</a>')
                   .append('<a class="upload" title="Upload or update cloud entree">U</a>')
                   .append('<a class="share" title="Share on Facebook">S</a>')
                   .append('<span class="cloudFlag" title="This spot is shared on the Cloud- it will be available on global search">C</span>');
            });


            list.on('click', '.delete', function (e) {
                var el = $(this).parent();
                var uuid = el.attr('data-uuid');

                fo.deleteSpot(uuid);
                el.slideUp().remove();

                e.preventDefault();
                e.stopImmediatePropagation()
            });

            list.on('click', '.edit', function (e) {
                var el = $(this).parent();
                var uuid = el.attr('data-uuid');

                var df = fo.db.get('spot', uuid);
                df.done(function (spot) {
                    var edit = $('#edit');
                    edit.find('#editLocation').val(spot.location);
                    edit.find('#editComment').val(spot.comment);
                    edit.find('#edituuid').val(spot.uuid);
                });
            });

            list.on('click', '.upload', function (e) {
                var uuid = $(this).parent().attr('data-uuid');
                fo.saveSpotToAzure(uuid);

                e.preventDefault();
                e.stopImmediatePropagation()
            });
        }
        else {
            spotList = '<li><p>No content</p></li>';
        }
        list.append(spotList);
    },

    unflagAzure: function (uuid) {
        var req = fo.db.get('spot', uuid);
        req.done(function (spot) {
            if (typeof spot !== "undefined") {
                spot.isCloud = false; // will unset Azure flag in local DB
                fo.db.put('spot', spot, uuid);
                fo.getLocalSpots();
            }
        });
    },
    saveSpotToAzure: function (uuid) {
        var req = fo.db.get('spot', uuid);
        req.done(function (spot) {
            if (typeof spot !== "undefined") {
                // set cloud flag
                spot.isCloud = true;

                var client = fo.client,
                             spotsTable = client.getTable('spots');
                spotsTable.insert(spot);

                fo.db.put('spot', spot, uuid);
                fo.getLocalSpots();
            }
        });
        this.hideLoading();
    },

    deleteAzureSpot: function (azureid, uuid, el) {

        this.loading("Deleting Cloud item");

        var client = fo.client,
                     spotsTable = client.getTable('spots');
        spotsTable.del({ id: azureid }).then(
                el.slideUp('slow').remove()
        );

        this.unflagAzure(uuid);
        this.hideLoading();
    },

    saveLocalSpot: function () {
        //var spot = {}
        var myForm = document.getElementById("spotForm");
        this.spot.uuid = myForm.uuid.value;
        this.spot.date = myForm.date.value;
        this.spot.lat = myForm.lat.value;
        this.spot.lng = myForm.lng.value;
        this.spot.location = myForm.location.value;
        this.spot.pict = this.getPict();
        this.spot.user = "cberube";
        this.spot.comment = this.getComment();
        this.spot.isCloud = false;

        if (!this.spot.uuid) return; //detect empty object 

        this.addLocalSpot();
    },

    searchLocationfromAzure: function () {

        this.loading("Loading Form Cloud");

        var client = fo.client,
                     spotsTable = client.getTable('spots');

        var loc = $('#searchLocation').val();

        var query = spotsTable.where({ location: loc });

        query.read().then(function (spots) {
            var spotList = "";
            var list = $('#spotList');
            if (spots.length) {
                spotList = $.map(spots, function (spot) {

                    return $('<li>')
                       .attr('data-azure-id', spot.id)
                       .attr('data-uuid', spot.uuid)
                       .append('<span class="tmb"></span>')
                       .append('<p>' + spot.location + '<br>' + spot.comment)
                       .append('<a class="deleteAzure" title="Delete from the Cloud">D</a>');
                });

                list.on('click', '.deleteAzure', function (e) { // should be only available for spot owner

                    var el = $(this).parent();
                    var id = el.attr('data-azure-id');
                    var uuid = el.attr('data-uuid');
                    fo.deleteAzureSpot(id, uuid, el);

                    e.preventDefault();
                    e.stopImmediatePropagation();
                });

            }
            else {
                spotList = '<li><p>No content</p></li>';
            }


            list.empty().append(spotList);
            list.parent().slideDown();
            fo.hideLoading();
        });
    },

    /* end data*/

    updateSpotForm: function () {
        var date = new Date(),
        that = document.getElementById("spotForm");
        this.getLocation(); // updates hidden fields
        if (that.uuid.value === "") { that.uuid.value = Math.uuid(); }
        that.comment.value = this.getComment();
        that.date.value = date;
        that.user.value = "cberube";
    },

    getComment: function () {
        var comment = document.getElementById("comment"),
            val = comment.value;
        //console.log(typeof val);
        if (typeof val !== "undefined" || val !== null || val !== "") {
            this.spot.comment = val;
            return this.spot.comment;
        }
    },

    getLocation: function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
               function (position) {
                   var lat = position.coords.latitude;
                   var lng = position.coords.longitude;
                   var myForm = $("#spotForm");
                   myForm.find("#lat").val(lat);
                   myForm.find("#lng").val(lng);
               },
               function errorCallback(error) {
                   console.log("error handling location");
               }
           );
        }
    },

    getPict: function () {
        var pict = document.getElementById("pict");
        if (pict !== null && typeof pict !== "undefined") {
            return pict.src;
        }
    },

    loading: function (txt) {
        $.mobile.loading("show", {
            text: txt,
            textVisible: true,
        });
    },

    hideLoading: function () {
        $.mobile.loading("hide");
    },

    init: function () {
        $(document).trigger('appInit');
    }
}


$(document).on("appInit", function () {
    $.mobile.phonegapNavigationEnabled = true;
    $.support.cors = true;
    $.mobile.allowCrossDomainPages = true;
    $.mobile.loader.prototype.options.text = "loading";
    $.mobile.loader.prototype.options.textVisible = false;
    $.mobile.loader.prototype.options.theme = "a";
    $.mobile.loader.prototype.options.html = "";
    window.setTimeout('fo.getLocalSpots()', 1000);

    $('#imageCapture').find('[type=reset]').trigger('click');

    $('body').css('display', 'block');

    // spot synch handler -> synch form with spot obj 
    $("#spotForm").on('blur', ' input', function (e) {
        fo.updateSpotForm();
    });

    // Grab spot save handler and resets spot obj
    $("#saveSpot").on("click", function (e) {
        fo.saveLocalSpot();
        $(this).find('[type=reset]').trigger('click');
        e.preventDefault();
        e.stopPropagation();
    });

    // Custom collapsible list handler -> li.enabled sections 
    $("ul.collapsible").on('click', '.header', function (e) {
        var that = $(this),
            el = that.parent(),
            content = that.parent().find('.content');

        if (content.hasClass('active') || el.hasClass('disabled')) {
            return false;
        }

        that.parents('ul').find('.content').filter('.active').removeClass('active').slideToggle();
        content.slideToggle().addClass('active');

        e.stopPropagation();
        e.preventDefault();
    });

    $("ul.collapsible .header").eq('0').trigger('click'); // opned first section -> grab spot

    //end collapsible

    // Search cloud handler
    $("#searchButton").on("click", function (e) {
        fo.searchLocationfromAzure();
        e.preventDefault();
        e.stopPropagation();
    });

    // Grab Spot reset handler
    $('#spotForm').on('click', '[type=reset]', function (e) {
        var parent = $(this).parent();
        parent.find('[type=hidden]').val('');
        $('#imageCapture').trigger('reset.imageCapture');
        parent.find('[type=file]').val('');
        fo.spot = {};

        e.stopPropagation();
        e.preventDefault();
    });

    // mySpot Edit handler
    $('#edit').on('click', 'button', function () {
        var form = $('#edit');
        var uuid = form.find('#edituuid').val();
        var loc = form.find('#editLocation').val();
        var cmt = form.find('#editComment').val();

        var req = fo.db.get('spot', uuid);
        req.done(function (spot) {
            // update values
            spot.location = loc;
            spot.comment = cmt;
            fo.db.put('spot', spot, uuid);
        });
        req.then(function (spot) {
            fo.getLocalSpots(); // My Spots list update
            $('#edit').dialog('close');
        });
    });
});