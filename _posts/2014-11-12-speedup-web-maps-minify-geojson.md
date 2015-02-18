---
layout: post
title: Speed up web maps - minify geojson
---

[GeoJSON](http://geojson.org/) has become de facto standard when it comes to transferring, manipulating and visualizing geospatial data on the web. Major mapping libraries like [Leaflet](http://leafletjs.com/) and [OpenLayers](http://openlayers.org/) have great support for it, making it pretty straightforward going from raw data to interactive web map. [Github](http://github.com/) has gone so long that they [show geodata](https://github.com/blog/1528-there-s-a-map-for-that) in a map view if it's commited to repository with .geojson-extension. No doubt geojson has become one of the most widespread geospatial formats.

## The problem
While GeoJSON is a very simple to understand and human readable format, it is awfully inefficient when it comes to storing data. Polygons and LineStrings are represented as a sequence of coordinates and, with each coordinate taking up at least 10-12 characters, files end up being bigger than necessary. When dealing with usual javascript and css assets it's a common practice to minify files to make pages load faster. Removing whitespaces, newlines and even renaming long names can reduce assets size significantly. Why don't we apply same techniques to geojson files?

I found [a blog post written by Bjørn 2 years ago](http://blog.thematicmapping.org/2012/11/how-to-minify-geojson-files.html) where he goes through simple tricks that help make GeoJSON files smaller, like removal of whitespaces, newlines and trailing zeros. But there's more we can do to achieve even better results.

## Delta and zigzag encoding
With lines and polygons being a series of consecutive coordinates it would be less space consuming to store the difference between coordinates instead of actual coordinates. Let's take an example and look at geometry for a simple triangle:

{% highlight javascript %}
{"type": "Polygon", "coordinates": [[[945508,1344056],[948263,1348583],[951207,1344119],[945508,1344056]]]}
{% endhighlight %}

As we can see each coordinate is represented separately as an array of two coordinates. Because in a polygon coordinates always follow the same order we can get rid of all the square brackets and store coordinates in a plain array:

{% highlight javascript %}
{"type": "Polygon", "coordinates": [945508,1344056,948263,1348583,951207,1344119,945508,1344056]}
{% endhighlight %}

By storing the difference between coordinates we can save even more space. We need to keep first coordinate in its original format so that we can restore coordinates later on.

{% highlight javascript %}
{"type": "Polygon", "coordinates": [945508,1344056,−2755,−4527,−2944,4464,5699,63]}
{% endhighlight %}

Now the 6 and 7 digit coordinates has become 4 and in some cases even 2 digits. We can go even further and apply [zigzag encoding](https://developers.google.com/protocol-buffers/docs/encoding#types) so that we get rid of negative signs, ending up with this result:

{% highlight javascript %}
{"type": "Polygon", "coordinates": [945508,1344056,5510,9054,5888,8927,11397,125]}
{% endhighlight %}

With this approach we trimmed 71 character geometry to 46 and that was only 4 coordinates. Imagine a geojson file with world countries borders where geometries are much more complex with thousands of coordinates in them.

## geojson-minifier
[Dane Springmeyer](https://twitter.com/springmeyer) mentioned in his [talk at FOSS4G'14](http://vimeo.com/106228141) that geometries in vector tiles are delta and zigzag encoded which results in a much more efficient storage - OpenStreetMap data for the whole planet can fit on a usb-stick. I was curious to find out how it can be applied to geojson and wrote a simple utility for that - `geojson-minifier`

`geojson-minifier` can be integrated into existing node.js application or used as standalone command line tool. Going back to Bjørns blog post, let's run files he ended up with through `geojson-minifier`:

{% highlight bash %}
node cli.js -o pack -f ~/Downloads/ne-v2/ne-countries-50m.json -p 2
File size before: 1447 kb
File size after: 538 kb
{% endhighlight %}

Unpacking minified geojson is as easy:

{% highlight bash %}
node cli.js -o unpack -f ~/Downloads/ne-v2/ne-countries-50m.json.packed -p 2
File size before: 538 kb
File size after: 1447 kb
{% endhighlight %}

As we can see, minified version is almost 3 times smaller. Here's how fragments of uncompressed(left) and compressed(right) files look like:

<img style="width:350px;" src="/assets/geojson-minifier/uncompressed.png" />
<img style="width:350px;" src="/assets/geojson-minifier/compressed.png" />

## Further thoughts
I can see 2 scenarios where this utility can be applied. If geojson files are static and don't change often it can be one time job to run them through minifier and serve to the client compressed version. If geojson is generated dynamically from for instance PostGIS one could use geojson minifier `pack/unpack` methods to integrate with existing node.js application. Once transfered over to the browser one could use `unpack` mehtod to convert minified geojson to original format. Even better would be to write plugins to Leaflet or OpenLayers that builds geometries on the fly from minified geojson.

[Give it a try](https://github.com/igorti/geojson-minifier) and let me know what you think!
