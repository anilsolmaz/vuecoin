
module.exports = {

    test: async function () {
        console.log('aşama 1')
        await new Promise(r => setTimeout(r, 2000));
        console.log('aşama 2')
        },
    test2: function () {
        console.log('aşama 3')
    }
}
