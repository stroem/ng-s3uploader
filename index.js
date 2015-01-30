'use strict';

var app = angular.module('');

app.provider('imageUploader', function() {

    var options = {
        folder: '',
        acl: 'public-read'
    };
    var configure = {
        setUploadOptions: function(opts) {
            for(var key in opts) {
                // Missing trailing slash in image_server
                if(key === 'image_server' && opts[key].slice(-1) !== '/')
                    opts[key] += '/';

                options[key] = opts[key];
            }
        },

        setRelativePathOnly: function(bool) {
            this.setUploadOptions({'relative_path': bool});
        },

        setImageServerHost: function(url) {
            this.setUploadOptions({'image_server': url});
        },

        setBucket: function(bucket) {
            this.setUploadOptions({bucket: bucket});
        },

        setS3AccessTokenUrl: function(url) {
            this.setUploadOptions({'access_token_url': url});
        }
    };

    angular.extend(this, configure);

    this.$get = function($rested, $q) {
        var fileurl = '';
        var randomString = function (length) {
            var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            var result = '';
            for (var i = length; i > 0; --i)
                result += chars[Math.round(Math.random() * (chars.length - 1))];

            return result;
        };

        return {
            uploadFile: function(dataUri, folder) {
                var deferred = $q.defer();
                var self = this;

                if(folder !== undefined)
                    options.folder = folder;

                $rested().all(options.access_token_url).get()
                    .then(function(s3) {
                        self.upload(options.image_server, options.bucket, options.folder,
                                    options.acl, s3.key, s3.policy, s3.signature, dataUri)
                            .then(deferred.resolve, deferred.reject, deferred.notify);
                    }, deferred.reject);

                return deferred.promise;
            },

            upload: function(image_server, bucket, folder, acl, accessKey, policy, signature, dataUri) {
                var s3_uri = 'https://' + bucket + '.s3.amazonaws.com/';
                var uploadUrl = options.relative_path ? '' : (image_server || s3_uri);
                var mime_string = dataUri.split(',')[0].split(':')[1].split(';')[0];
                var ext_type = mime_string.split('/')[1];
                var filename = folder + (new Date()).getTime() + '-' + randomString(16) + '.' + ext_type;

                var binary = atob(dataUri.split(',')[1]);
                var array = [];
                for (var i = 0; i < binary.length; i++) {
                    array.push(binary.charCodeAt(i));
                }

                var image_blob = new Blob([new Uint8Array(array)], {type: mime_string});

                var fd = new FormData();
                fd.append('key', filename);
                fd.append('acl', acl);
                fd.append('Content-Type', mime_string);
                fd.append('AWSAccessKeyId', accessKey);
                fd.append('policy', policy);
                fd.append('signature', signature);
                fd.append('file', image_blob);

                var deferred = $q.defer();
                var xhr = new XMLHttpRequest();

                // Stores a function to be called automatically each time the
                // readyState property changes
                xhr.onreadystatechange = function() {
                    // 4: request finished and response is ready
                    if(xhr.readyState === 4) {
                        if(xhr.status === 200 || xhr.status === 204) {
                            deferred.resolve(uploadUrl + filename);
                        } else {
                            deferred.reject(xhr.responseText);
                        }
                    }
                };

                xhr.open('POST', s3_uri, true);
                xhr.send(fd);

                xhr.addEventListener('load', function () {
                    deferred.resolve(uploadUrl + filename);
                });

                xhr.addEventListener('error', deferred.reject, false);
                xhr.addEventListener('abort', deferred.reject, false);

                deferred.notify(uploadUrl + filename);
                fileurl = uploadUrl + filename;
                return deferred.promise;
            },

            fileurl: function () {
                return fileurl;
            }
        };
    };
});
