---
layout: post
title: Export Runmeter workouts to geojson
---

I've been actively running for about 4 years now and through the years I happened to use [Runmeter app for iPhone](https://itunes.apple.com/us/app/runmeter-gps-pedometer-running/id326498704?mt=8) to track my runs. Especially in the beginning this app was priceless to me because it often gave me motivation to go out for a run and beat that previous time record even on the days when running was the last thing I wanted to do. To this day I've accumulated about 500 runs and while all these runs are viewable in the app I really wanted to find a way to export them to a format, like geojson, that can be easily manipulated and visualized.

## It's all in the database
Like most iOS apps, Runmeter stores its data in sqlite database. It turned out that getting database out of the app is easy - you can do it through File Sharing in iTunes:

![](/assets/runmeter/filesharing.png)

Once database is exported to selected location, we can use `sqlite3` command to see its contents:

{% highlight bash %}
☺  sqlite3 Meter.db
SQLite version 3.8.5 2014-08-15 22:37:57
Enter ".help" for usage hints.
sqlite> .tables
abTest                  emailUpdates            runState
activity                emailUpdatesMailbox     sensor
activityInterval        facebook                sensorData
activityType            locationBlob            settings
activityZone            meter                   shoes
activityZoneSet         motionBlob              stepData
altitude                myFitnessPal            stepStopDetection
announcements           notify                  stopDetection
backup                  pedometerData           stopwatchStatusIcon
bike                    plan                    strava
bikeSpeedStopDetection  planActivity            support
calendar                purchase                temperatureData
competitor              register                twitter
coordinate              route                   voice
dailymile               run
dashboard               runInterval
{% endhighlight %}

Two tables are interesting here:

- `run` - contains information about individual runs, like date, start time, distance, etc.
- `coordinate` - stores coordinates for each run every time they are logged by device.

Now we can write [simple `node.js` script](https://github.com/igorti/runmeter2geojson/blob/master/index.js) that reads data from database with `sqlite3` package and builds geojson structure with LineString geometries. Each run looks like this:

{% highlight javascript %}
{
  type: 'Feature',
  properties:
   {
      id: 479,
      start_time: '2014-11-10 09:34:33.179',
      run_time: '35:44',
      distance: 6.424,
      ascent: 48,
      descent: 82,
      calories: 574,
      locality: 'Stockholm'
    },
    geometry: {
      type: 'LineString',
      coordinates: [[12.134286,57.715759], ...]
    }
}
{% endhighlight %}

## Optimize for the web

The resulting geojson file turns out to be about 10mb, which can take a while to download even for users sitting on a wifi connection, not  to mention those on 3G. [In my previous blog post](http://igortihonov.com/2014/11/12/speedup-web-maps-minify-geojson/) I wrote about small utility `geojson-minifier` which can shrink the size of geojson files 3-4 times. Running our `runs.geojson` through this utility indeed does make it much smaller.

{% highlight bash %}
☺  geojson-minifier -o pack -f runs.geojson p -6
File size before: 9434 kb
File size after: 1972 kb
{% endhighlight %}

With gzip compression file shrinks even further. While still being quite big, considering that it contains about 250000 coordinates, it's acceptable.

After decoding packed geojson [with geojson-minifier `unpack` method](https://github.com/igorti/geojson-minifier/blob/master/index.js#L38-L71) here's what runs look like on beautiful [Mapbox Outdoors](https://www.mapbox.com/blog/mapbox-outdoors/) map:

![](/assets/runmeter/runs.png)

## What about your runs?

Do you track your runs or bike rides with Runmeter or other apps like Runkeeper, Endomondo or Strava? It would be interesting to see if this script can be customized to support more providers!

