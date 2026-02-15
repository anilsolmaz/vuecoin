let parent = {
    func2: function() {
        return new Promise(function (resolve, reject) {
            return resolve(1);
        });
    },
    func1: function() {
        baba = this
        return new Promise(function (resolve, reject) {
            baba.func2().then( (count) => {
                console.log(count + 1);
            });
        });
    }
}

parent.func1();
