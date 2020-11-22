/*
 * Copyright 2020 Miklos Vajna. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

async function onGpsClick()
{
    let gps = document.querySelector("#filter-based-on-position");
    gps.removeChild(gps.childNodes[0]);

    // Get the coordinates.
    gps.textContent = "Waiting for GPS...";
    let latitude = 0;
    let longitude = 0;
    try
    {
        let position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
    }
    catch (reason)
    {
        gps.textContent = "Error from GPS: " + reason;
        return;
    }

    // Get the relations that include this coordinate.
    let query = "[out:json] [timeout:425];\n";
    query += "is_in(" + latitude + "," + longitude + ");\n";
    query += "(._;>;);";
    query += "out meta;";
    gps.textContent = "Waiting for Overpass...";
    var protocol = location.protocol != "http:" ? "https:" : "http:";
    var url = protocol + "//overpass-api.de/api/interpreter";
    var request = new Request(url, {method : "POST", body : query});
    var overpassJson = null;
    try
    {
        var response = await window.fetch(request);
        overpassJson = await response.json();
    }
    catch (reason)
    {
        gps.textContent = "Error from Overpass: " + reason;
        return;
    }

    // Build a list of relations.
    var relationIds = [];
    var elements = overpassJson.elements;
    for (let i = 0; i < elements.length; i += 1)
    {
        var element = elements[i];
        if (element.id < 3600000000)
        {
            // Not a relation.
            continue;
        }

        relationIds.push(element.id - 3600000000);
    }

    // Now fetch the list of relations we recognize.
    url = "@PREFIX@/static/relations.json";
    request = new Request(url);
    gps.textContent = "Waiting for relations...";
    var knownRelations = null;
    try
    {
        response = await window.fetch(request);
        knownRelations = await response.json();
    }
    catch (reason)
    {
        gps.textContent = "Error from relations: " + reason;
        return;
    }

    // Filter out the relations we don't recognize.
    var knownRelationIds = [];
    for (let i = 0; i < relationIds.length; i += 1)
    {
        let relationId = relationIds[i];
        if (!knownRelations.includes(relationId))
        {
            continue;
        }

        knownRelationIds.push(relationId);
    }

    // Redirect.
    gps.textContent = "Waiting for redirect...";
    url = "@PREFIX@/filter-for/relations/" + knownRelationIds.join(",");
    window.location.href = url;
}

// eslint-disable-next-line no-unused-vars
document.addEventListener("DOMContentLoaded", async function(event) {
    let gps = document.querySelector("#filter-based-on-position");
    if (!gps)
    {
        return;
    }

    let gpsLink = gps.childNodes[0];
    gpsLink.onclick = onGpsClick;
});

// vim: shiftwidth=4 softtabstop=4 expandtab: