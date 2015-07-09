for (var i = 0; i < dataFilenames.length; i++)
{
    for (var j = 0; j < canvases.length; j++)
    {
        if (canvases[j]['@id'] === 'http://www.e-codices.unifr.ch/metadata/iiif/csg-0390/canvas/csg-' + dataFilenames[i])
        {
            canvases[j].otherContent = [
                {
                    '@id': 'http://dev.simssa.ca/iiif/csg-0' + dataFilenames[i].slice(0, 7) + '/list.json',
                    '@type': 'sc:AnnotationList'
                }
            ];
        }
    }
}
