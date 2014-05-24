'use strict'

var app = angular.module('ngS3Uploader');

app.factory('s3uploader',
    ['$http','$q',
        function($http, $q) {

            var fileurl = "";
            var randomString = function (length) {
                var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
                var result = '';
                for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];

                return result;
            };

            return {
                uploadFile: function(opts, dataUri) {
                    var fileurl = "";
                    var deferred = $q.defer();
                    var t = this;

                    $http.get(opts.access_token_url)
                        .success(function(s3) {

                            t.upload(opts.bucket, opts.folder, opts.acl, s3.key, s3.policy, s3.signature, dataUri)
                                .then(function(image_url){
                                    deferred.resolve(image_url);
                                }, deferred.reject, deferred.notify);
                        })
                        .error(deferred.reject);

                    return deferred.promise;
                },

                upload: function(bucket, folder, acl, accessKey, policy, signature, dataUri) {
                    var s3_uri = 'https://' + bucket + '.s3.amazonaws.com/';
                    var mime_string = dataUri.split(',')[0].split(':')[1].split(';')[0]
                    var ext_type = mime_string.split("/")[1];
                    var file_name = folder + (new Date()).getTime() + '-' + randomString(16) + "." + ext_type;

                    var binary = atob(dataUri.split(',')[1]);
                    var array = [];
                    for(var i = 0; i < binary.length; i++) {
                        array.push(binary.charCodeAt(i));
                    }

                    var image_blob = new Blob([new Uint8Array(array)], {type: mime_string});

                    var fd = new FormData();
                    fd.append('key', file_name);
                    fd.append('acl', acl);
                    fd.append('Content-Type', mime_string);
                    fd.append('AWSAccessKeyId', accessKey);
                    fd.append('policy', policy);
                    fd.append('signature', signature);
                    fd.append("file", image_blob);

                    var deferred = $q.defer();

                    var xhr = new XMLHttpRequest();
                    xhr.open('POST', s3_uri, true);
                    xhr.send(fd);

                    xhr.addEventListener('load', function() {
                        //deferred.resolve(s3_uri + file_name);
                    });

                    xhr.addEventListener("error", deferred.reject, false);
                    xhr.addEventListener("abort", deferred.reject, false);

                    deferred.notify(s3_uri + file_name);
                    fileurl = s3_uri + file_name;
                    return deferred.promise;
                },

                fileurl: function() {
                    return fileurl;
                }
            };
        }
    ]
)
