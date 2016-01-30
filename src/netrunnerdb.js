"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

require("babel-polyfill");

var _fuse = require("fuse.js");

var _fuse2 = _interopRequireDefault(_fuse);

var _render = require("./netrunnerdb/render");

var _render2 = _interopRequireDefault(_render);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (robot) {
  // Load NDB on startup
  robot.http("http://netrunnerdb.com/api/cards/").get()(function (err, res, body) {
    var cards = JSON.parse(body);
    var types = cards.reduce(function (acc, card) {
      acc.add(card.type_code);
      card.subtype_code.split(' - ').forEach(function (subtype) {
        return acc.add(subtype);
      });
      return acc;
    }, new Set());

    robot.brain.set("cards", cards);
    robot.brain.set("card_types", Array.from(types));
  });

  function search(orig) {
    var allCards = robot.brain.get("cards");
    var types = new Set(robot.brain.get("card_types"));
    types.add("id");

    var aliases = robot.brain.get("hubot-alias-table") || {};
    var text = aliases[orig] || orig;

    var match = text.match(/([^/]+)\/(.+)/);
    var usingFlag = match && types.has(match[1]);

    var cards = usingFlag ? allCards.filter(function (card) {
      var flag = match[1];
      var typ = flag === "id" ? "identity" : flag;
      return card.type_code === typ || card.subtype_code.indexOf(flag) > -1;
    }) : allCards;

    var query = usingFlag ? match[2] : text;

    var options = {
      caseSensitive: false,
      include: ['score'],
      shouldSort: true,
      threshold: 0.6,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      keys: ['title']
    };
    return new _fuse2.default(cards, options).search(query);
  }

  function interact(query, res, transform) {
    var cards = search(query);
    if (cards.length > 0) {
      var card = cards.filter(function (c) {
        return c.score === cards[0].score;
      }).sort(function (c1, c2) {
        return c1.item.title.length - c2.item.title.length;
      })[0];
      res.send(transform(card.item));
    } else {
      res.send("Couldn't find a Netrunner card name matching \"" + query + "\"");
    }
  }

  function registerRegex(rgx, index, transform) {
    robot.respond(rgx, function (res) {
      var query = res.match[index];
      interact(query, res, transform);
    });
  }

  registerRegex(/(nrdb|netrunner(db)?) (.*)/i, 3, function (card) {
    return "http://netrunnerdb.com" + card.imagesrc;
  });
  registerRegex(/(nrtx|netrunner(db)?text) (.*)/i, 3, _render2.default);
  robot.hear(/\[\[[^\]]+\]\]/g, function (res) {
    res.match.forEach(function (match) {
      var query = match.slice(2, match.length - 2);
      interact(query, res, _render2.default);
    });
  });
}; // Description:
//   Simple NetrunnerDB.com card image / text fetcher
//
// Dependencies:
//   none
//
// Configuration:
//   none
//
// Commands:
//   hubot nrdb <card name> - Displays the Netrunner card <card name>
//   hubot netrunner <card name> - Displays the Netrunner card <card name>
//   hubot netrunnerdb <card name> - Displays the Netrunner card <card name>
//   hubot nrtx <card name> - Displays the Netrunner card <card name>, as text
//   hubot netrunnertext <card name> - Displays the Netrunner card <card name>, as text
//   hubot netrunnerdbtext <card name> - Displays the Netrunner card <card name>, as text
//
// Author:
//   SohumB, thalweg
//

module.exports = exports['default'];